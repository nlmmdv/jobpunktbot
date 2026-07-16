import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

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

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { action, ...data } = body;

    if (action === "create") {
      const { vacancy_id, owner_telegram_id, freelancer_telegram_id, freelancer_resume_id, initiated_by } = data;

      if (!vacancy_id || !initiated_by) {
        throw new Error("Missing required fields");
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
        throw new Error("Invalid initiated_by");
      }

      if (!ownerId || !freelancerId) {
        throw new Error("Missing required fields");
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
          throw new Error("Уже существует отклик на эту вакансию");
        }
        throw error;
      }

      return { match };
    }

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
      return { matches: withProfiles };
    }

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
      return { matches: withProfiles };
    }

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

      return { match: updated };
    }

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

      return { match: updated };
    }

    throw new Error("Unknown action");
  })
);
