import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, userId, body) => {
    const { action, ...data } = body;

    if (action === "get") {
      const { data: resume, error } = await supabase
        .from("freelancer_resumes")
        .select("*")
        .eq("telegram_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return { resume: resume || null };
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

      return { resume };
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

      return { resume };
    }

    throw new Error("Unknown action");
  })
);
