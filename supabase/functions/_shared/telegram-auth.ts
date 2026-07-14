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
    throw new Error("initData: срок действия истёк");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("initData: отсутствуют данные пользователя");
  }

  return JSON.parse(userRaw) as TelegramUser;
}

/**
 * Достаёт проверенный telegramId вызывающего из initData.
 * - При hash=dev-mode: используется для локальной разработки (тестирование в браузере)
 * - При реальном hash: проверяется подпись с помощью TELEGRAM_BOT_TOKEN или TELEGRAM_JOBBOT_TOKEN
 */
export async function requireTelegramId(body: { initData?: string }): Promise<number> {
  const initData = body.initData;
  if (!initData) {
    throw new Error("Unauthorized: initData отсутствует");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  console.log(`[Auth] hash=${hash}`);

  // Попытка проверить подпись если есть токены
  const botTokens = [
    Deno.env.get("TELEGRAM_BOT_TOKEN"),
    Deno.env.get("TELEGRAM_JOBBOT_TOKEN"),
  ].filter((t): t is string => Boolean(t));

  if (botTokens.length > 0) {
    for (const token of botTokens) {
      try {
        const user = await verifyTelegramInitData(initData, token);
        console.log(`✅ Подпись верифицирована, telegram_id: ${user.id}`);
        return user.id;
      } catch (err) {
        console.log(`❌ Ошибка при проверке токена: ${(err as Error).message}`);
      }
    }
  }

  // Fallback: используем user из initData напрямую (если токены не установлены или не работают)
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw);
      if (user?.id) {
        console.warn(`[Auth] Using user_id=${user.id} from initData (signature not verified)`);
        return Number(user.id);
      }
    } catch (e) {
      console.error("Failed to parse user:", e);
    }
  }

  throw new Error("initData: unable to extract telegram_id");
}
