import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { triggerBotEvent } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Верифицируем initData
    let telegramId: number;
    try {
      telegramId = await requireTelegramId(body);
    } catch (authErr) {
      console.error("Auth error:", authErr);
      return jsonResponse({ success: false, error: (authErr as Error).message }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Извлекаем данные регистрации из запроса
    const { role, phone, first_name, last_name, city, telegram_username } = body;

    if (!role || !first_name || !phone) {
      return jsonResponse(
        { success: false, error: "Missing required fields: role, first_name, phone" },
        400
      );
    }

    // profiles — общая таблица платформы, где роли admin/ceo/developer дают широкие
    // права. Это приложение регистрирует только работников и владельцев, поэтому
    // роль из тела запроса пропускаем через белый список (иначе — эскалация прав).
    if (!["employee", "owner"].includes(role)) {
      return jsonResponse({ success: false, error: "Invalid role" }, 400);
    }

    // Проверяем что пользователь ещё не зарегистрирован
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (existing) {
      return jsonResponse({ success: false, error: "User already registered" }, 409);
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

    // Роль передаём явно: онбординг у сотрудника и владельца разный.
    await triggerBotEvent({ type: "onboarding", data: { telegram_id: telegramId, role } });

    return jsonResponse({ success: true, profile }, 201);
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
