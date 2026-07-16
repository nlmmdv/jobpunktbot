import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { action, ...data } = body;

    if (action === "create") {
      const { title, description, city, address, date, start_time, end_time, hourly_rate, marketplaces, metro_stations } = data;

      const { data: shift, error } = await supabase
        .from("freelancer_shifts")
        .insert({
          freelancer_telegram_id: telegramId,
          title,
          description: description || null,
          city: city || null,
          address: address || null,
          date,
          start_time,
          end_time,
          hourly_rate: hourly_rate || null,
          marketplaces: marketplaces || [],
          metro_stations: metro_stations || [],
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return { shift };
    }

    if (action === "list") {
      const { data: shifts, error } = await supabase
        .from("freelancer_shifts")
        .select("*")
        .eq("freelancer_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { shifts: shifts || [] };
    }

    if (action === "get") {
      const { id } = data;
      const { data: shift, error } = await supabase
        .from("freelancer_shifts")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return { shift: shift || null };
    }

    if (action === "update") {
      const { id, title, description, city, address, date, start_time, end_time, hourly_rate, marketplaces, metro_stations, status } = data;

      const { data: shift, error } = await supabase
        .from("freelancer_shifts")
        .update({
          title: title || undefined,
          description: description || undefined,
          city: city || undefined,
          address: address || undefined,
          date: date || undefined,
          start_time: start_time || undefined,
          end_time: end_time || undefined,
          hourly_rate: hourly_rate || undefined,
          marketplaces: marketplaces || undefined,
          metro_stations: metro_stations || undefined,
          status: status || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("freelancer_telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return { shift };
    }

    if (action === "delete") {
      const { id } = data;
      const { error } = await supabase
        .from("freelancer_shifts")
        .delete()
        .eq("id", id)
        .eq("freelancer_telegram_id", telegramId);

      if (error) throw error;
      return { deleted: true };
    }

    throw new Error("Unknown action");
  })
);
