import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json() as SendMessageRequest;

    // Validate required fields
    if (!payload.telegramId || !payload.message) {
      return new Response(
        JSON.stringify({ error: "Missing telegramId or message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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
