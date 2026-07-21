// Проверка подписи Telegram WebApp initData по алгоритму из документации:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// Без этой проверки любой клиент мог прислать чужой telegramId в теле запроса
// и читать/менять данные другого пользователя (IDOR).

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

async function hmacSha256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Проверяет подпись initData и возвращает верифицированные данные пользователя.
 * Бросает исключение, если подпись неверна, отсутствует или истекла.
 */
export async function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): Promise<TelegramUser> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData: отсутствует hash");
  }
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const computedHash = toHex(await hmacSha256(secretKey, dataCheckString));

  if (computedHash !== hash) {
    throw new Error("initData: неверная подпись");
  }

  const authDate = Number(params.get("auth_date") || "0");
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    // Обновить initData можно только переоткрыв мини-апп — так и пишем.
    throw new Error("Сессия устарела. Закройте и откройте приложение заново.");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("initData: отсутствуют данные пользователя");
  }

  return JSON.parse(userRaw) as TelegramUser;
}

/**
 * Достаёт проверенный telegramId вызывающего из initData.
 * ВАЖНО: Требует TELEGRAM_BOT_TOKEN или TELEGRAM_JOBBOT_TOKEN для верификации подписи.
 * Без проверки подписи возможна подделка initData (IDOR).
 */
export async function requireTelegramId(body: { initData?: string }): Promise<number> {
  const initData = body.initData;
  if (!initData) {
    throw new Error("Unauthorized: initData отсутствует");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  // DEV-MODE: обходит проверку подписи, поэтому разрешён ТОЛЬКО при явном опте
  // ALLOW_DEV_AUTH=true. В продакшене эта переменная не задаётся → ветка не срабатывает,
  // и запрос уходит на настоящую проверку подписи ниже. Без этого гейта любой мог прислать
  // hash=dev-mode с чужим user.id и обойти авторизацию (IDOR).
  if (hash === "dev-mode" && Deno.env.get("ALLOW_DEV_AUTH") === "true") {
    const userRaw = params.get("user");
    const devUser = userRaw ? JSON.parse(userRaw) : null;
    if (devUser?.id) {
      console.log(`[Auth] Dev-mode: user_id=${devUser.id}`);
      return Number(devUser.id);
    }
  }

  // PRODUCTION: требуем валидную подпись бота
  const botToken = Deno.env.get("TELEGRAM_JOBBOT_TOKEN");

  if (!botToken) {
    throw new Error("Server misconfigured: TELEGRAM_JOBBOT_TOKEN не установлен");
  }

  try {
    const user = await verifyTelegramInitData(initData, botToken);
    console.log(`✅ Подпись верифицирована, telegram_id: ${user.id}`);
    return user.id;
  } catch (err) {
    console.error("Signature verification failed:", err);
    console.error("initData params:", new URLSearchParams(initData).toString().substring(0, 100));
    // Причину НЕ подменяем: истёкший auth_date раньше показывался как «неверная
    // подпись», и было непонятно, что достаточно переоткрыть приложение.
    throw err instanceof Error ? err : new Error("initData: неверная подпись");
  }
}
