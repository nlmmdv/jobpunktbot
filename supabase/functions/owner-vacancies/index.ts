import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { assertNotBlocked, BlockedError } from "../_shared/moderation.ts";
import { assertRateLimit, RateLimitError } from "../_shared/rate-limit.ts";
import { clampText, COUNT_LIMITS, LimitError, TEXT_LIMITS } from "../_shared/limits.ts";

// Таблица в проде — owner_vacancies (не vacancies), владелец в ней — telegram_id
// (не owner_telegram_id). Колонок title/employment_type/hourly_rate/updated_at нет.
// Статусы: 'active' | 'deleted'.
const TABLE = "owner_vacancies";

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

    assertRateLimit(telegramId);

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
      const { type, description, address, city, date, start_time, end_time, schedule, payment, marketplaces, metro_stations } = data;

      const { count, error: countError } = await supabase
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .eq("telegram_id", telegramId)
        .eq("status", "active");

      if (countError) throw countError;
      if ((count ?? 0) >= COUNT_LIMITS.ownerVacancies) {
        throw new LimitError(`Максимум ${COUNT_LIMITS.ownerVacancies} активных вакансий`);
      }

      const { data: vacancy, error } = await supabase
        .from(TABLE)
        .insert({
          telegram_id: telegramId,
          type: type || "permanent",
          description: clampText(description, TEXT_LIMITS.description) || null,
          address: address || null,
          city: city || null,
          date: date || null,
          start_time: start_time || null,
          end_time: end_time || null,
          schedule: schedule || null,
          payment: payment || null,
          marketplaces: marketplaces || [],
          metro_stations: metro_stations || [],
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, vacancy }, 201);
    }

    if (action === "list") {
      const { data: vacancies, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("telegram_id", telegramId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse({ success: true, vacancies: vacancies || [] });
    }

    if (action === "get") {
      const { id } = data;
      const { data: vacancy, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ success: true, vacancy: vacancy || null });
    }

    if (action === "update") {
      const { id, type, description, address, city, date, start_time, end_time, schedule, payment, marketplaces, metro_stations, status } = data;

      const { data: vacancy, error } = await supabase
        .from(TABLE)
        .update({
          type: type || undefined,
          description: description ? clampText(description, TEXT_LIMITS.description) : undefined,
          address: address || undefined,
          city: city || undefined,
          date: date || undefined,
          start_time: start_time || undefined,
          end_time: end_time || undefined,
          schedule: schedule || undefined,
          payment: payment || undefined,
          marketplaces: marketplaces || undefined,
          metro_stations: metro_stations || undefined,
          status: status || undefined,
        })
        .eq("id", id)
        .eq("telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, vacancy });
    }

    if (action === "delete") {
      const { id } = data;

      // Мягкое удаление: жёсткий DELETE каскадом снёс бы связанные job_matches.
      const { error } = await supabase
        .from(TABLE)
        .update({ status: "deleted" })
        .eq("id", id)
        .eq("telegram_id", telegramId);

      if (error) throw error;
      return jsonResponse({ success: true, deleted: true });
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
    if (err instanceof BlockedError) {
      return jsonResponse({ success: false, error: err.message }, 403);
    }
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
