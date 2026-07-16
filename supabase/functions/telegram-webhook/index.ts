import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { botMessages } from "../_shared/bot-messages.ts";

/**
 * Webhook для получения обновлений от Telegram бота
 * Обрабатывает команды и события от пользователей
 */

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    data?: string;
  };
}

/**
 * Отправить сообщение через send-telegram-message функцию
 */
async function sendBotMessage(telegramId: number, message: string): Promise<void> {
  const functionsUrl = Deno.env.get("SUPABASE_URL")?.replace(".co", ".co/functions/v1");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!functionsUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  const response = await fetch(`${functionsUrl}/send-telegram-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      telegramId,
      message,
      parseMode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send message: ${JSON.stringify(error)}`);
  }
}

/**
 * Обработка текстовых команд
 */
async function handleMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message || !message.text) return;

  const telegramId = message.from.id;
  const firstName = message.from.first_name;
  const text = message.text.trim();

  console.log(`Message from ${firstName} (${telegramId}): ${text}`);

  // Обработка команд
  if (text === "/start" || text.startsWith("/start ")) {
    const msg = botMessages.start(firstName);
    await sendBotMessage(telegramId, msg);
    return;
  }

  if (text === "/help") {
    const msg = botMessages.help();
    await sendBotMessage(telegramId, msg);
    return;
  }

  if (text === "/support") {
    const msg = botMessages.support();
    await sendBotMessage(telegramId, msg);
    return;
  }

  if (text === "/app") {
    const msg = botMessages.appLink();
    await sendBotMessage(telegramId, msg);
    return;
  }

  // Если команда не распознана
  if (text.startsWith("/")) {
    const msg = `❓ Команда \`${text}\` не распознана.\n\nДоступные команды:\n/start - главное меню\n/help - справка\n/support - поддержка\n/app - открыть приложение`;
    await sendBotMessage(telegramId, msg);
    return;
  }

  // Обычное сообщение — показываем справку
  const msg = `👋 Привет! Я бот ПроПункт и помогу тебе с работой на ПВЗ.\n\nЖми /help для справки или /app чтобы открыть приложение.`;
  await sendBotMessage(telegramId, msg);
}

/**
 * Обработка callback запросов (нажатия кнопок)
 */
async function handleCallbackQuery(update: TelegramUpdate): Promise<void> {
  const callback = update.callback_query;
  if (!callback) return;

  const telegramId = callback.from.id;
  const callbackData = callback.data || "";

  console.log(`Callback from ${callback.from.first_name} (${telegramId}): ${callbackData}`);

  // Здесь обрабатываем inline buttons в будущем
  // Пока просто логируем
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Проверяем webhook secret
  if (!requireInternalAuth(req)) {
    console.error("Invalid webhook secret");
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    // Парсим тело запроса
    const update: TelegramUpdate = await req.json();

    console.log(`Received update: ${update.update_id}`);

    // Обрабатываем сообщения
    if (update.message) {
      await handleMessage(update);
    }

    // Обрабатываем callback queries (нажатия кнопок)
    if (update.callback_query) {
      await handleCallbackQuery(update);
    }

    // Ответ Telegram что всё получилось (важно для надёжности)
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Даже при ошибке отвечаем 200 чтобы Telegram не пересылал апдейт
    return jsonResponse({ ok: true, error: (error as Error).message }, 200);
  }
});
