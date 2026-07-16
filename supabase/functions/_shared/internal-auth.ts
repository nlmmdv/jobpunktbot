// Функции отправки сообщений нельзя выставлять наружу: иначе кто угодно отправит
// произвольный текст любому пользователю от имени бота. Публичный anon-ключ,
// которым Supabase гейтит функции по умолчанию, от этого не защищает — он лежит
// в бандле фронтенда.
//
// Поэтому пропускаем только вызовы, предъявившие service_role-ключ, то есть наши
// же edge-функции (клиент этот ключ никогда не видит).

export function assertInternalCall(req: Request): void {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    throw new Error("Server misconfigured: SUPABASE_SERVICE_ROLE_KEY не установлен");
  }

  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token !== serviceKey) {
    throw new Error("Forbidden: функция доступна только внутренним вызовам");
  }
}
