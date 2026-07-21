import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { triggerBotEvent } from "../_shared/notify.ts";
import { ratingsFor, EMPTY_RATING } from "../_shared/ratings.ts";
import { assertRateLimit, RateLimitError } from "../_shared/rate-limit.ts";
import { COUNT_LIMITS, LimitError } from "../_shared/limits.ts";

/** Начало сегодняшнего дня по Москве — по нему считаем суточный лимит. */
function startOfTodayMoscow(): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${date}T00:00:00+03:00`;
}

// Реальная схема прода: вакансии лежат в owner_vacancies и НЕ имеют колонки title
// (заголовок карточки — address). Внешнего ключа job_matches -> profiles нет,
// поэтому профили подтягиваем отдельным запросом по telegram_id, а не эмбедом.
const VACANCY_FIELDS = "id, address, payment, date, start_time, end_time";

/** Данные вакансии и профиля для текста уведомления. */
async function fetchVacancy(supabase: any, vacancyId: string) {
  const { data } = await supabase
    .from("owner_vacancies")
    .select("address, payment, marketplaces, date, start_time, end_time")
    .eq("id", vacancyId)
    .maybeSingle();
  return data || {};
}

async function fetchProfile(supabase: any, telegramId: number) {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, telegram_username")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data;
}

/** Результат отклика сообщаем тому, кто его инициировал. */
async function notifyMatchResolved(supabase: any, match: any, accepted: boolean) {
  const initiatedByFreelancer = match.initiated_by === "freelancer";
  const recipientId = initiatedByFreelancer ? match.freelancer_telegram_id : match.owner_telegram_id;
  const otherId = initiatedByFreelancer ? match.owner_telegram_id : match.freelancer_telegram_id;

  const [vacancy, other] = await Promise.all([
    fetchVacancy(supabase, match.vacancy_id),
    accepted ? fetchProfile(supabase, otherId) : Promise.resolve(null),
  ]);

  await triggerBotEvent({
    type: accepted ? "match_accepted" : "match_rejected",
    data: {
      telegram_id: recipientId,
      vacancy,
      contact_username: other?.telegram_username || null,
    },
  });
}

async function attachProfiles(
  supabase: any,
  matches: any[],
  idField: "owner_telegram_id" | "freelancer_telegram_id"
) {
  const ids = [...new Set(matches.map((m) => m[idField]).filter(Boolean))];
  if (ids.length === 0) return matches;

  const [{ data: profiles, error }, ratings] = await Promise.all([
    supabase
      .from("profiles")
      .select("telegram_id, first_name, last_name, telegram_username, city")
      .in("telegram_id", ids),
    ratingsFor(supabase, ids),
  ]);

  if (error) throw error;

  const byTelegramId = new Map((profiles || []).map((p: any) => [p.telegram_id, p]));
  // Рейтинг второй стороны кладём в тот же объект profiles — фронт показывает
  // его в карточке отклика.
  return matches.map((m) => ({
    ...m,
    profiles: byTelegramId.get(m[idField])
      ? { ...byTelegramId.get(m[idField]), ...(ratings.get(m[idField]) || EMPTY_RATING) }
      : null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...data } = body;

    let telegramId: number;
    try {
      telegramId = await requireTelegramId(body);
    } catch (authErr) {
      console.error("Auth error:", authErr);
      return jsonResponse({ success: false, error: (authErr as Error).message }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    assertRateLimit(telegramId);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // CREATE: freelancer responds to vacancy or owner offers vacancy
    if (action === "create") {
      const { vacancy_id, owner_telegram_id, freelancer_telegram_id, freelancer_resume_id, initiated_by } = data;

      if (!vacancy_id || !initiated_by) {
        return jsonResponse({ success: false, error: "Missing required fields" }, 400);
      }

      // Сторону инициатора берём из проверенной подписи Telegram, а не из тела
      // запроса — иначе любой мог бы создать отклик от чужого имени (IDOR).
      let ownerId: number | undefined;
      let freelancerId: number | undefined;

      if (initiated_by === "freelancer") {
        freelancerId = telegramId;
        ownerId = owner_telegram_id;
      } else if (initiated_by === "owner") {
        ownerId = telegramId;
        // search-freelancers намеренно не отдаёт telegram_id фрилансера, поэтому
        // клиент присылает id резюме, а telegram_id резолвим здесь.
        if (freelancer_resume_id) {
          const { data: resume, error: resumeErr } = await supabase
            .from("freelancer_resumes")
            .select("telegram_id")
            .eq("id", freelancer_resume_id)
            .single();

          if (resumeErr) throw resumeErr;
          freelancerId = resume?.telegram_id;
        } else {
          freelancerId = freelancer_telegram_id;
        }
      } else {
        return jsonResponse({ success: false, error: "Invalid initiated_by" }, 400);
      }

      if (!ownerId || !freelancerId) {
        return jsonResponse({ success: false, error: "Missing required fields" }, 400);
      }

      if (initiated_by === "freelancer") {
        const { count, error: countError } = await supabase
          .from("job_matches")
          .select("id", { count: "exact", head: true })
          .eq("freelancer_telegram_id", freelancerId)
          .eq("status", "pending");

        if (countError) throw countError;
        if ((count ?? 0) >= COUNT_LIMITS.freelancerPendingMatches) {
          throw new LimitError(
            `Максимум ${COUNT_LIMITS.freelancerPendingMatches} активных откликов. Дождитесь ответа или отмените старые.`
          );
        }
      } else {
        const { count, error: countError } = await supabase
          .from("job_matches")
          .select("id", { count: "exact", head: true })
          .eq("owner_telegram_id", ownerId)
          .eq("initiated_by", "owner")
          .gte("created_at", startOfTodayMoscow());

        if (countError) throw countError;
        if ((count ?? 0) >= COUNT_LIMITS.ownerOffersPerDay) {
          throw new LimitError(`Максимум ${COUNT_LIMITS.ownerOffersPerDay} предложений в день`);
        }
      }

      const { data: match, error } = await supabase
        .from("job_matches")
        .insert({
          vacancy_id,
          owner_telegram_id: ownerId,
          freelancer_telegram_id: freelancerId,
          initiated_by,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonResponse(
            { success: false, error: "Уже существует отклик на эту вакансию" },
            409
          );
        }
        throw error;
      }

      // Уведомляем противоположную сторону — инициатор и так знает, что нажал.
      const vacancy = await fetchVacancy(supabase, vacancy_id);
      if (initiated_by === "freelancer") {
        const applicant = await fetchProfile(supabase, freelancerId);
        await triggerBotEvent({
          type: "new_application",
          data: {
            telegram_id: ownerId,
            vacancy,
            applicant_name:
              [applicant?.first_name, applicant?.last_name].filter(Boolean).join(" ") || "Кандидат",
          },
        });
      } else {
        await triggerBotEvent({
          type: "new_offer",
          data: { telegram_id: freelancerId, vacancy },
        });
      }

      return jsonResponse({ success: true, match }, 201);
    }

    // LIST: freelancer's matches (both responses and offers)
    if (action === "list-for-freelancer") {
      const { data: matches, error } = await supabase
        .from("job_matches")
        .select(`
          id,
          vacancy_id,
          owner_telegram_id,
          status,
          initiated_by,
          created_at,
          responded_at,
          owner_vacancies ( ${VACANCY_FIELDS} )
        `)
        .eq("freelancer_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const withProfiles = await attachProfiles(supabase, matches || [], "owner_telegram_id");
      return jsonResponse({ success: true, matches: withProfiles });
    }

    // LIST: owner's matches (both offers and responses)
    if (action === "list-for-owner") {
      const { data: matches, error } = await supabase
        .from("job_matches")
        .select(`
          id,
          vacancy_id,
          freelancer_telegram_id,
          status,
          initiated_by,
          created_at,
          responded_at,
          owner_vacancies ( ${VACANCY_FIELDS} )
        `)
        .eq("owner_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const withProfiles = await attachProfiles(supabase, matches || [], "freelancer_telegram_id");
      return jsonResponse({ success: true, matches: withProfiles });
    }

    // ACCEPT: respond to a match
    if (action === "accept") {
      const { id } = data;

      const { data: updated, error } = await supabase
        .from("job_matches")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await notifyMatchResolved(supabase, updated, true);

      return jsonResponse({ success: true, match: updated });
    }

    // REJECT: decline a match
    if (action === "reject") {
      const { id } = data;

      const { data: updated, error } = await supabase
        .from("job_matches")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await notifyMatchResolved(supabase, updated, false);

      return jsonResponse({ success: true, match: updated });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    // Лимиты — ожидаемый ответ пользователю, а не сбой сервера.
    if (err instanceof LimitError) {
      return jsonResponse({ success: false, error: err.message }, 409);
    }
    if (err instanceof RateLimitError) {
      return jsonResponse({ success: false, error: err.message }, 429);
    }
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
