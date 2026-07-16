import { assertInternalCall } from "../_shared/internal-auth.ts";

// Тот же бот, которым tg-auth проверяет подписи initData, — сообщения должны
// приходить от бота, в котором пользователь открывает приложение.
const BOT_TOKEN = Deno.env.get("TELEGRAM_JOBBOT_TOKEN");

interface SendMessageRequest {
  telegramId: number;
  message: string;
  parseMode?: "HTML" | "Markdown";
  replyMarkup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
  };
}

async function sendTelegramMessage(payload: SendMessageRequest) {
  if (!BOT_TOKEN) {
    throw new Error("Server misconfigured: TELEGRAM_JOBBOT_TOKEN не установлен");
  }

  const body: Record<string, unknown> = {
    chat_id: payload.telegramId,
    text: payload.message,
    parse_mode: payload.parseMode || "HTML",
  };

  if (payload.replyMarkup) {
    body.reply_markup = payload.replyMarkup;
  }

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    assertInternalCall(req);
  } catch (authErr) {
    console.error("Rejected external call:", authErr);
    return new Response(
      JSON.stringify({ error: (authErr as Error).message }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = (await req.json()) as SendMessageRequest;

    if (!payload.telegramId || !payload.message) {
      return new Response(
        JSON.stringify({ error: "Missing telegramId or message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await sendTelegramMessage(payload);

    // Лог в консоль функции (её собирает Supabase). Персистентной таблицы логов
    // намеренно нет: база общая с платформой, заводить в ней таблицу — отдельное
    // осознанное решение, а не побочный эффект отправки сообщения.
    console.log(`Sent message to telegram_id=${payload.telegramId}`);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
