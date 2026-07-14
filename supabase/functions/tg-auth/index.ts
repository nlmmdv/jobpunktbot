import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";

Deno.serve(async (req) => {
  console.log(`[tg-auth] ${req.method} request received`);

  if (req.method === "OPTIONS") {
    console.log("[tg-auth] Returning OPTIONS response");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
      console.log("[tg-auth] Body parsed successfully");
    } catch (parseErr) {
      console.error("[tg-auth] Failed to parse JSON:", parseErr);
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // Получаем telegram_id из подписанного initData
    let telegramId: number;
    try {
      console.log("[tg-auth] Calling requireTelegramId");
      telegramId = await requireTelegramId(body);
      console.log(`[tg-auth] Got telegramId: ${telegramId}`);
    } catch (authErr) {
      console.error("[tg-auth] Auth error:", authErr);
      return jsonResponse({ success: false, error: String(authErr) }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[tg-auth] Missing Supabase credentials");
      return jsonResponse({ success: false, error: "Server not configured" }, 500);
    }

    console.log(`[tg-auth] Creating Supabase client for ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем профиль пользователя из БД
    console.log(`[tg-auth] Fetching profile for telegram_id=${telegramId}`);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (error) {
      console.log(`[tg-auth] Database query error: ${error.code} - ${error.message}`);
      if (error.code !== "PGRST116") {
        console.error("[tg-auth] Critical database error:", error);
        return jsonResponse({ success: false, error: error.message }, 500);
      }
    }

    console.log(`[tg-auth] Auth success for telegram_id=${telegramId}, profile=${profile ? "found" : "not found"}`);
    return jsonResponse({ success: true, profile: profile || null });
  } catch (err) {
    console.error("[tg-auth] Unhandled error:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: errorMsg }, 500);
  }
});
