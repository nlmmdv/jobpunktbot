import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { botMessages, openAppButton } from "../_shared/bot-messages.ts";

// Вебхук Telegram: сюда прилетают апдейты от бота (нажатие /start и т.п.).
//
// В отличие от остальных функций, этот эндпоинт публичный по необходимости —
// его вызывает Telegram, а он не умеет предъявлять наши ключи. Поэтому в
// config.toml для него выключен verify_jwt, а единственная защита — секрет,
// который Telegram присылает заголовком X-Telegram-Bot-Api-Secret-Token
// (задаётся один раз при setWebhook). Без этой проверки кто угодно слал бы боту
// поддельные апдейты.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

/** Telegram ретраит доставку на любой не-2xx и может отключить вебхук, поэтому
 *  на свои внутренние ошибки отвечаем 200 — они уходят в логи, а не в ретраи. */
const ok = () => new Response("ok", { status: 200 });

async function sendMessage(telegramId: number, message: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ telegramId, message, replyMarkup: openAppButton() }),
  });

  if (!response.ok) {
    throw new Error(`send-telegram-message failed: ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WEBHOOK_SECRET) {
    // Без секрета проверить, что это действительно Telegram, нечем — молча
    // ничего не делаем, вместо того чтобы обрабатывать что попало.
    console.error("TELEGRAM_WEBHOOK_SECRET не установлен — апдейт пропущен");
    return ok();
  }

  if (req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    console.error("Rejected update: неверный secret token");
    return new Response("Forbidden", { status: 403 });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const update = await req.json();
    const message = update?.message;
    const text: string | undefined = message?.text?.trim();
    const chatId: number | undefined = message?.chat?.id;
    const fromId: number | undefined = message?.from?.id;

    // Интересует только /start; остальные апдейты подтверждаем и игнорируем.
    if (!chatId || !fromId || !text?.startsWith("/start")) {
      return ok();
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("telegram_id", fromId)
      .maybeSingle();

    // Зарегистрированного встречаем по имени, новому объясняем, что это за бот.
    await sendMessage(
      chatId,
      profile?.first_name ? botMessages.startReturning(profile.first_name) : botMessages.start()
    );

    console.log(`/start handled for telegram_id=${fromId}, registered=${Boolean(profile)}`);
  } catch (error) {
    console.error("Error handling Telegram update:", error);
  }

  return ok();
});
