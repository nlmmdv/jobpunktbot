import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { assertNotBlocked, BlockedError } from "../_shared/moderation.ts";
import { assertRateLimit, RateLimitError } from "../_shared/rate-limit.ts";
import { LimitError } from "../_shared/limits.ts";

// Реальная схема freelancer_shifts: id, telegram_id, date, start_time, end_time,
// rate, metro, marketplaces, created_at, updated_at.
// Колонок freelancer_telegram_id / title / description / city / address /
// hourly_rate / metro_stations / status в таблице НЕТ — прежняя версия функции
// писала именно в них, поэтому создание подработки падало всегда.

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
      const { date, start_time, end_time, rate, marketplaces, metro } = data;

      if (!date) {
        return jsonResponse({ success: false, error: "Не указана дата" }, 400);
      }

      // Одна заявка на дату: в таблице нет колонки status, поэтому достаточно
      // пары telegram_id + date.
      const { count, error: countError } = await supabase
        .from("freelancer_shifts")
        .select("id", { count: "exact", head: true })
        .eq("telegram_id", telegramId)
        .eq("date", date);

      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new LimitError("У вас уже есть заявка на эту дату");
      }

      const { data: shift, error } = await supabase
        .from("freelancer_shifts")
        .insert({
          telegram_id: telegramId,
          date,
          start_time: start_time || null,
          end_time: end_time || null,
          rate: rate || null,
          marketplaces: marketplaces || [],
          metro: metro || [],
        })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, shift }, 201);
    }

    if (action === "list") {
      const { data: shifts, error } = await supabase
        .from("freelancer_shifts")
        .select("*")
        .eq("telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse({ success: true, shifts: shifts || [] });
    }

    if (action === "get") {
      const { id } = data;
      const { data: shift, error } = await supabase
        .from("freelancer_shifts")
        .select("*")
        .eq("id", id)
        .eq("telegram_id", telegramId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ success: true, shift: shift || null });
    }

    if (action === "update") {
      const { id, date, start_time, end_time, rate, marketplaces, metro } = data;

      // Смена даты не должна создавать второй заявки на тот же день.
      if (date) {
        const { count, error: countError } = await supabase
          .from("freelancer_shifts")
          .select("id", { count: "exact", head: true })
          .eq("telegram_id", telegramId)
          .eq("date", date)
          .neq("id", id);

        if (countError) throw countError;
        if ((count ?? 0) > 0) {
          throw new LimitError("У вас уже есть заявка на эту дату");
        }
      }

      const { data: shift, error } = await supabase
        .from("freelancer_shifts")
        .update({
          date: date || undefined,
          start_time: start_time || undefined,
          end_time: end_time || undefined,
          rate: rate || undefined,
          marketplaces: marketplaces || undefined,
          metro: metro || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, shift });
    }

    if (action === "delete") {
      const { id } = data;
      const { error } = await supabase
        .from("freelancer_shifts")
        .delete()
        .eq("id", id)
        .eq("telegram_id", telegramId);

      if (error) throw error;
      return jsonResponse({ success: true, deleted: true });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    // Лимиты — ожидаемый ответ пользователю (409), а не сбой сервера.
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
