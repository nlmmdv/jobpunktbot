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

    if (action === "create") {
      const { type, title, description, address, city, date, start_time, end_time, employment_type, hourly_rate, payment, marketplaces, metro_stations } = data;

      const { data: vacancy, error } = await supabase
        .from("vacancies")
        .insert({
          owner_telegram_id: telegramId,
          type: type || "permanent",
          title,
          description: description || null,
          address: address || null,
          city: city || null,
          date: date || null,
          start_time: start_time || null,
          end_time: end_time || null,
          employment_type: employment_type || null,
          hourly_rate: hourly_rate || null,
          payment: payment || null,
          marketplaces: marketplaces || [],
          metro_stations: metro_stations || [],
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, vacancy }, 201);
    }

    if (action === "list") {
      const { data: vacancies, error } = await supabase
        .from("vacancies")
        .select("*")
        .eq("owner_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse({ success: true, vacancies: vacancies || [] });
    }

    if (action === "get") {
      const { id } = data;
      const { data: vacancy, error } = await supabase
        .from("vacancies")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ success: true, vacancy: vacancy || null });
    }

    if (action === "update") {
      const { id, type, title, description, address, city, date, start_time, end_time, employment_type, hourly_rate, payment, marketplaces, metro_stations, status } = data;

      const { data: vacancy, error } = await supabase
        .from("vacancies")
        .update({
          type: type || undefined,
          title: title || undefined,
          description: description || undefined,
          address: address || undefined,
          city: city || undefined,
          date: date || undefined,
          start_time: start_time || undefined,
          end_time: end_time || undefined,
          employment_type: employment_type || undefined,
          hourly_rate: hourly_rate || undefined,
          payment: payment || undefined,
          marketplaces: marketplaces || undefined,
          metro_stations: metro_stations || undefined,
          status: status || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, vacancy });
    }

    if (action === "delete") {
      const { id } = data;
      const { error } = await supabase
        .from("vacancies")
        .delete()
        .eq("id", id)
        .eq("owner_telegram_id", telegramId);

      if (error) throw error;
      return jsonResponse({ success: true, deleted: true });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
