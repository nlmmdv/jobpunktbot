import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...data } = body;

    // telegramId берём из подписанного Telegram initData, а не из тела запроса —
    // иначе любой клиент мог бы прочитать/изменить чужое резюме, подставив чужой id.
    let userId: number;
    try {
      userId = await requireTelegramId(body);
    } catch (authErr) {
      return jsonResponse({ success: false, error: (authErr as Error).message }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "get") {
      const { data: resume, error } = await supabase
        .from("freelancer_resumes")
        .select("*")
        .eq("telegram_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return jsonResponse({ success: true, resume: resume || null });
    }

    if (action === "create") {
      const { data: resume, error } = await supabase
        .from("freelancer_resumes")
        .insert({
          telegram_id: userId,
          first_name: data.first_name || "Пользователь",
          last_name: data.last_name || "Freelancer",
          phone: data.phone || "",
          city: data.city || "Москва",
          about: data.about || null,
          photo_url: data.photo_url || null,
          marketplaces: data.marketplaces || [],
          preferred_schedule: data.preferred_schedule || null,
          hourly_rate: data.hourly_rate || null,
          metro_stations: data.metro_stations || [],
          status: data.status || "active",
        })
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, resume }, 201);
    }

    if (action === "update") {
      const { data: resume, error } = await supabase
        .from("freelancer_resumes")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          city: data.city,
          about: data.about || null,
          photo_url: data.photo_url || null,
          marketplaces: data.marketplaces || [],
          preferred_schedule: data.preferred_schedule || null,
          hourly_rate: data.hourly_rate || null,
          metro_stations: data.metro_stations || [],
          status: data.status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", userId)
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, resume });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
