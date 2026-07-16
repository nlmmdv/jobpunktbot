import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

const TABLE = "owner_vacancies";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { action, ...data } = body;

    if (action === "create") {
      const { type, description, address, city, date, start_time, end_time, schedule, payment, marketplaces, metro_stations } = data;

      const { data: vacancy, error } = await supabase
        .from(TABLE)
        .insert({
          telegram_id: telegramId,
          type: type || "permanent",
          description: description || null,
          address: address || null,
          city: city || null,
          date: date || null,
          start_time: start_time || null,
          end_time: end_time || null,
          schedule: schedule || null,
          payment: payment || null,
          marketplaces: marketplaces || [],
          metro_stations: metro_stations || [],
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return { vacancy };
    }

    if (action === "list") {
      const { data: vacancies, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("telegram_id", telegramId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { vacancies: vacancies || [] };
    }

    if (action === "get") {
      const { id } = data;
      const { data: vacancy, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return { vacancy: vacancy || null };
    }

    if (action === "update") {
      const { id, type, description, address, city, date, start_time, end_time, schedule, payment, marketplaces, metro_stations, status } = data;

      const { data: vacancy, error } = await supabase
        .from(TABLE)
        .update({
          type: type || undefined,
          description: description || undefined,
          address: address || undefined,
          city: city || undefined,
          date: date || undefined,
          start_time: start_time || undefined,
          end_time: end_time || undefined,
          schedule: schedule || undefined,
          payment: payment || undefined,
          marketplaces: marketplaces || undefined,
          metro_stations: metro_stations || undefined,
          status: status || undefined,
        })
        .eq("id", id)
        .eq("telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return { vacancy };
    }

    if (action === "delete") {
      const { id } = data;

      // Мягкое удаление: жёсткий DELETE каскадом снёс бы связанные job_matches.
      const { error } = await supabase
        .from(TABLE)
        .update({ status: "deleted" })
        .eq("id", id)
        .eq("telegram_id", telegramId);

      if (error) throw error;
      return { deleted: true };
    }

    throw new Error("Unknown action");
  })
);
