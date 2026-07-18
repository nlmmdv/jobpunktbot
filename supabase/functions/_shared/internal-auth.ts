// Функции отправки сообщений нельзя выставлять наружу: иначе кто угодно отправит
// произвольный текст любому пользователю от имени бота. Публичный anon-ключ,
// которым Supabase гейтит функции по умолчанию (verify_jwt=true), от этого не
// защищает — он лежит в бандле фронтенда. Пропускаем только service_role.
//
// Проверяем НЕ строковым сравнением с SUPABASE_SERVICE_ROLE_KEY: в проектах с
// новым форматом ключей значение, инжектируемое в функцию, отличается от
// service_role-JWT из дашборда, и ручной/cron-вызов ложно получал 403. Поэтому
// смотрим claim `role` в самом токене. Подпись уже проверена Supabase на входе
// (verify_jwt=true для этих функций), так что claim'у можно доверять.

function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

export function assertInternalCall(req: Request): void {
  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    throw new Error("Forbidden: функция доступна только внутренним вызовам");
  }

  // Вызов от другой edge-функции: она шлёт ровно то, что лежит в её env, —
  // сравнение env-с-env всегда сходится независимо от формата ключа.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return;

  // Ручной вызов или pg_cron с service_role-ключом из дашборда.
  if (jwtRole(token) === "service_role") return;

  throw new Error("Forbidden: функция доступна только внутренним вызовам");
}
