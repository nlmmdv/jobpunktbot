import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, city } = await req.json();

    if (!type || !["temporary", "permanent"].includes(type)) {
      return jsonResponse({ success: false, error: "Invalid type" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("owner_vacancies")
      .select("*")
      .eq("type", type)
      .eq("status", "active");

    if (city && city !== "Все") {
      query = query.eq("city", city);
    }

    const { data: vacancies, error } = await query;

    if (error) throw error;

    return jsonResponse({ success: true, vacancies: vacancies || [] });
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
