import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// Публичный поиск фрилансеров не требует авторизации, но не должен отдавать
// персональные данные (телефон, telegram_id) незнакомым вызывающим — раньше
// select("*") отдавал их всем без ограничений.
const PUBLIC_COLUMNS =
  "id, first_name, last_name, city, about, photo_url, marketplaces, preferred_schedule, hourly_rate, metro_stations";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { city, marketplace } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("freelancer_resumes")
      .select(PUBLIC_COLUMNS)
      .eq("status", "active");

    if (city && city !== "Все") {
      query = query.eq("city", city);
    }

    if (marketplace && marketplace !== "Все") {
      query = query.contains("marketplaces", [marketplace]);
    }

    const { data: freelancers, error } = await query;

    if (error) throw error;

    return jsonResponse({ success: true, freelancers: freelancers || [] });
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
