import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { role, phone, first_name, last_name, city, telegram_username } = body;

    if (!role || !first_name || !phone) {
      throw new Error("Missing required fields: role, first_name, phone");
    }

    // profiles — общая таблица платформы, где роли admin/ceo/developer дают широкие
    // права. Это приложение регистрирует только работников и владельцев, поэтому
    // роль из тела запроса пропускаем через белый список (иначе — эскалация прав).
    if (!["employee", "owner"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Проверяем что пользователь ещё не зарегистрирован
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (existing) {
      throw new Error("User already registered");
    }

    // Создаём профиль
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        telegram_id: telegramId,
        role,
        phone,
        first_name,
        last_name: last_name || null,
        city: city || null,
        telegram_username: telegram_username || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log(`Registration success for telegram_id=${telegramId}, role=${role}`);
    return { profile };
  })
);
