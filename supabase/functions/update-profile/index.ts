import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { first_name, last_name, city, about } = body;

    // telegramId берём из подписанного Telegram initData, а не из тела запроса —
    // иначе любой клиент мог бы обновить чужой профиль, подставив чужой id.
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        city: city || undefined,
        status: about || undefined,
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) throw error;

    return { profile };
  })
);
