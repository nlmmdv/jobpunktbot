// Отправка уведомления — вспомогательное действие: если бот недоступен или
// Telegram отвечает ошибкой, основная операция (отклик, принятие, регистрация)
// всё равно должна пройти. Поэтому здесь ничего не бросаем, только логируем.

export async function triggerBotEvent(event: {
  type: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("Bot event skipped: missing Supabase credentials");
    return;
  }

  try {
    const response = await fetch(`${url}/functions/v1/handle-bot-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error(`Bot event "${event.type}" failed:`, await response.text());
    }
  } catch (err) {
    console.error(`Bot event "${event.type}" failed:`, err);
  }
}
