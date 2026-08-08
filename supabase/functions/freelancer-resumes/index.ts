import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { assertNotBlocked, BlockedError } from "../_shared/moderation.ts";
import { ratingFor } from "../_shared/ratings.ts";
import { assertRateLimit, RateLimitError } from "../_shared/rate-limit.ts";
import { clampText, TEXT_LIMITS, LimitError } from "../_shared/limits.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...data } = body;

    // telegramId берём из подписанного Telegram initData, а не из тела запроса —
    // иначе любой клиент мог бы прочитать/изменить чужое резюме, подставив чужой id.
    let userId: number;
    try {
      userId = await requireTelegramId(body);
    } catch (authErr) {
      console.error(`[freelancer-resumes] Auth error: ${(authErr as Error).message}`);
      return jsonResponse({ success: false, error: (authErr as Error).message }, 401);
    }

    assertRateLimit(userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Заблокированный аккаунт не должен действовать в обход интерфейса:
    // подпись у него остаётся валидной, а вход в приложение он миновать может.
    await assertNotBlocked(supabase, userId);

    // Берём последнее резюме, а не .single(): тот возвращает PGRST116 и когда
    // строк нет, и когда их несколько, а код трактовал обе ситуации как
    // «резюме нет» — из-за этого дубликаты прятали резюме и плодились дальше.
    const latestResume = async () => {
      const { data, error } = await supabase
        .from("freelancer_resumes")
        .select("*")
        .eq("telegram_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    };

    if (action === "get") {
      const resume = await latestResume();
      const rating = await ratingFor(supabase, userId);

      return jsonResponse({ success: true, resume: resume || null, ...rating });
    }

    if (action === "create") {
      // Второе резюме создавать нельзя: у человека оно одно, а дубликаты
      // показываются владельцу как разные кандидаты.
      const existing = await latestResume();
      if (existing) {
        throw new LimitError("Резюме уже создано — его можно отредактировать");
      }

      const { data: resume, error } = await supabase
        .from("freelancer_resumes")
        .insert({
          telegram_id: userId,
          first_name: data.first_name || "Пользователь",
          last_name: data.last_name || "Freelancer",
          phone: data.phone || "",
          city: data.city || "Москва",
          about: clampText(data.about, TEXT_LIMITS.about) || null,
          photo_url: data.photo_url || null,
          marketplaces: data.marketplaces || [],
          preferred_schedule: data.preferred_schedule || null,
          hourly_rate: data.hourly_rate || null,
          metro_stations: data.metro_stations || [],
          status: data.status || "active",
        })
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, resume }, 201);
    }

    if (action === "update") {
      // Правим конкретную запись, а не все строки этого telegram_id: при
      // дубликатах прежний вариант молча перезаписывал их все.
      const target = await latestResume();
      if (!target) {
        return jsonResponse({ success: false, error: "Резюме не найдено" }, 404);
      }

      const { data: resume, error } = await supabase
        .from("freelancer_resumes")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          city: data.city,
          about: clampText(data.about, TEXT_LIMITS.about) || null,
          photo_url: data.photo_url || null,
          marketplaces: data.marketplaces || [],
          preferred_schedule: data.preferred_schedule || null,
          hourly_rate: data.hourly_rate || null,
          metro_stations: data.metro_stations || [],
          status: data.status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.id)
        // telegram_id оставляем в условии как страховку: править можно только своё.
        .eq("telegram_id", userId)
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, resume });
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
