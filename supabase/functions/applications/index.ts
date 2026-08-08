import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { assertNotBlocked, BlockedError } from "../_shared/moderation.ts";

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

    // Заблокированный аккаунт не должен действовать в обход интерфейса:
    // подпись у него остаётся валидной, а вход в приложение он миновать может.
    await assertNotBlocked(supabase, telegramId);

    if (action === "create") {
      const { vacancy_id } = data;

      const { data: application, error } = await supabase
        .from("applications")
        .insert({
          vacancy_id,
          freelancer_telegram_id: telegramId,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonResponse({ success: false, error: "Вы уже подали заявку на эту вакансию" }, 409);
        }
        throw error;
      }

      return jsonResponse({ success: true, application }, 201);
    }

    if (action === "list") {
      const { for_owner } = data;

      let query = supabase.from("applications").select("*");

      if (for_owner) {
        // Owner wants to see applications on their vacancies
        query = query.eq("vacancy:vacancies.owner_telegram_id", telegramId);
      } else {
        // Freelancer wants to see their own applications
        query = query.eq("freelancer_telegram_id", telegramId);
      }

      const { data: applications, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse({ success: true, applications: applications || [] });
    }

    if (action === "get") {
      const { id } = data;
      const { data: application, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ success: true, application: application || null });
    }

    if (action === "update") {
      const { id, status } = data;

      const { data: application, error } = await supabase
        .from("applications")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, application });
    }

    if (action === "withdraw") {
      const { id } = data;

      const { data: application, error } = await supabase
        .from("applications")
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("freelancer_telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, application });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof BlockedError) {
      // code читает клиент, чтобы отправить человека на экран блокировки,
      // не разбирая текст сообщения.
      return jsonResponse({ success: false, error: err.message, code: "BLOCKED" }, 403);
    }
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
