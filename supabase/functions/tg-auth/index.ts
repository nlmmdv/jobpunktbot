import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, _body) => {
    // Получаем профиль пользователя из БД
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Database error:", error);
      throw error;
    }

    console.log(`Auth success for telegram_id=${telegramId}`);
    return { profile: profile || null };
  })
);
