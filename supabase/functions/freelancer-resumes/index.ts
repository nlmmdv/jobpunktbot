import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, telegramId, ...data } = await req.json();

    // Dev mode bypass
    let userId = telegramId;
    if (!userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        // In dev mode, token might be dev-mode
        if (token === "dev-mode") {
          userId = 123456789; // Dev user
        }
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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

      return new Response(
        JSON.stringify({ success: true, resume: resume || null }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "create") {
      console.log("Creating resume for user:", userId);

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

      if (error) {
        console.error("Create error:", error);
        throw error;
      }

      console.log("Resume created:", resume);

      return new Response(
        JSON.stringify({ success: true, resume }),
        { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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

      return new Response(
        JSON.stringify({ success: true, resume }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
