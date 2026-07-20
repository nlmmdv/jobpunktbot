import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { ratingFor } from "../_shared/ratings.ts";

// Рейтинг пользователя по telegram_id. Публичная агрегированная информация
// (средний балл + число оценок), поэтому подпись Telegram не требуем — как и
// search-freelancers. Персональных данных не отдаём.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { telegramId } = await req.json();
    if (!telegramId) {
      return jsonResponse({ success: false, error: "Missing telegramId" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const rating = await ratingFor(supabase, Number(telegramId));

    return jsonResponse({ success: true, ...rating });
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
