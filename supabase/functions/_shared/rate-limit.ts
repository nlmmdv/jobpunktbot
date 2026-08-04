// Простой rate limit: не более N запросов в минуту на пользователя.
//
// Счётчик держим в памяти изолята. Это осознанный MVP-компромисс: Supabase может
// поднять несколько изолятов и перезапускать их, поэтому лимит приблизительный —
// он гасит случайный шторм запросов от одного клиента, но не является защитой от
// целенаправленной атаки. Для строгого лимита нужен общий счётчик в БД/Redis.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const MAX_TRACKED_KEYS = 5000;

const hits = new Map<string, number>();

export class RateLimitError extends Error {
  constructor() {
    super("Слишком много запросов. Подождите минуту.");
    this.name = "RateLimitError";
  }
}

/** Возвращает false, если лимит исчерпан. */
export function checkRateLimit(telegramId: number, max = MAX_PER_WINDOW): boolean {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  const key = `${telegramId}:${bucket}`;
  const count = (hits.get(key) ?? 0) + 1;
  hits.set(key, count);

  // Чистим ключи прошлых минут, чтобы Map не рос бесконечно.
  if (hits.size > MAX_TRACKED_KEYS) {
    const suffix = `:${bucket}`;
    for (const k of hits.keys()) {
      if (!k.endsWith(suffix)) hits.delete(k);
    }
  }

  return count <= max;
}

/** Бросает RateLimitError при превышении — вызывать сразу после проверки подписи. */
export function assertRateLimit(telegramId: number, max = MAX_PER_WINDOW): void {
  if (!checkRateLimit(telegramId, max)) {
    throw new RateLimitError();
  }
}
