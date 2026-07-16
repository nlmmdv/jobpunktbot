/**
 * Проверка webhook secret от Telegram
 * Гарантирует что апдейты идут только от Telegram, не от посторонних
 */

export function verifyWebhookSecret(headerValue: string | null): boolean {
  const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET not configured");
    return false;
  }

  if (!headerValue) {
    console.warn("X-Telegram-Bot-Api-Secret-Token header missing");
    return false;
  }

  // Сравнивать нужно с постоянным временем чтобы избежать timing attacks
  return timingSafeEqual(headerValue, webhookSecret);
}

/**
 * Comparison с защитой от timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Проверка что это именно Telegram мини-приложение (для будущих функций)
 */
export function requireInternalAuth(req: Request): boolean {
  const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  return verifyWebhookSecret(secretToken);
}
