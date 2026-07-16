import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";

// Реальная схема прода: вакансии лежат в owner_vacancies и НЕ имеют колонки title
// (заголовок карточки — address). Внешнего ключа job_matches -> profiles нет,
// поэтому профили подтягиваем отдельным запросом по telegram_id, а не эмбедом.
const VACANCY_FIELDS = "id, address, payment, date, start_time, end_time";

async function attachProfiles(
  supabase: any,
  matches: any[],
  idField: "owner_telegram_id" | "freelancer_telegram_id"
) {
  const ids = [...new Set(matches.map((m) => m[idField]).filter(Boolean))];
  if (ids.length === 0) return matches;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("telegram_id, first_name, last_name, telegram_username, city")
    .in("telegram_id", ids);

  if (error) throw error;

  const byTelegramId = new Map((profiles || []).map((p: any) => [p.telegram_id, p]));
  return matches.map((m) => ({ ...m, profiles: byTelegramId.get(m[idField]) || null }));
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

      return jsonResponse({ success: true, match: updated });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
