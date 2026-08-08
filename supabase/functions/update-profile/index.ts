import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { assertNotBlocked, BlockedError } from "../_shared/moderation.ts";
import { assertRateLimit, RateLimitError } from "../_shared/rate-limit.ts";
import { clampText, TEXT_LIMITS } from "../_shared/limits.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { first_name, last_name, city, about } = body;

    // telegramId берём из подписанного Telegram initData, а не из тела запроса —
    // иначе любой клиент мог бы обновить чужой профиль, подставив чужой id.
    let telegramId: number;
    try {
      telegramId = await requireTelegramId(body);
    } catch (authErr) {
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

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        city: city || undefined,
        // Пишем в about, а НЕ в status: status — поле платформы (employed/active),
        // и запись сюда текста «о себе» затирала статус занятости пользователя.
        about: about !== undefined ? clampText(about, TEXT_LIMITS.about) : undefined,
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse({ success: true, profile });
  } catch (err) {
    // Лимиты — ожидаемый ответ пользователю, а не сбой сервера.
    if (err instanceof RateLimitError) {
      return jsonResponse({ success: false, error: err.message }, 429);
    }
    if (err instanceof BlockedError) {
      // code читает клиент, чтобы отправить человека на экран блокировки,
      // не разбирая текст сообщения.
      return jsonResponse({ success: false, error: err.message, code: "BLOCKED" }, 403);
    }
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
