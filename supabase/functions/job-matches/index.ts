import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";

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
      const { vacancy_id, owner_telegram_id, freelancer_telegram_id, initiated_by } = data;

      if (!vacancy_id || !owner_telegram_id || !freelancer_telegram_id || !initiated_by) {
        return jsonResponse(
          { success: false, error: "Missing required fields" },
          400
        );
      }

      const { data: match, error } = await supabase
        .from("job_matches")
        .insert({
          vacancy_id,
          owner_telegram_id,
          freelancer_telegram_id,
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
          owner_vacancies (
            id,
            title,
            address,
            payment,
            date,
            start_time,
            end_time
          ),
          profiles!owner_telegram_id (
            first_name,
            last_name,
            telegram_username
          )
        `)
        .eq("freelancer_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return jsonResponse({ success: true, matches: matches || [] });
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
          owner_vacancies (
            id,
            title,
            address,
            payment
          ),
          profiles!freelancer_telegram_id (
            first_name,
            last_name,
            telegram_username,
            city
          )
        `)
        .eq("owner_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return jsonResponse({ success: true, matches: matches || [] });
    }

    // ACCEPT: respond to a match
    if (action === "accept") {
      const { id } = data;

      const { data: match, error: fetchError } = await supabase
        .from("job_matches")
        .select(`
          *,
          profiles!owner_telegram_id (telegram_username),
          freelancer!profiles_freelancer (telegram_username)
        `)
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

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
