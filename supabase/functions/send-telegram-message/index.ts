import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

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
    throw new Error("TELEGRAM_BOT_TOKEN not set");
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: payload.telegramId,
    text: payload.message,
    parse_mode: payload.parseMode || "HTML",
  };

  if (payload.replyMarkup) {
    body.reply_markup = payload.replyMarkup;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

Deno.serve((req) =>
  handlePublicEdgeFunction(req, async (supabase, body) => {
    const payload = body as SendMessageRequest;

    if (!payload.telegramId || !payload.message) {
      throw new Error("Missing telegramId or message");
    }

    const result = await sendTelegramMessage(payload);

    // Log the message send
    await supabase
      .from("telegram_message_logs")
      .insert({
        telegram_id: payload.telegramId,
        message_text: payload.message,
        sent_at: new Date().toISOString(),
        telegram_response: result,
      })
      .throwOnError();

    return { result };
  })
);
