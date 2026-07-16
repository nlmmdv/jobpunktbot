import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { action, ...data } = body;

    if (action === "create") {
      const { vacancy_id } = data;

      const { data: application, error } = await supabase
        .from("applications")
        .insert({
          vacancy_id,
          freelancer_telegram_id: telegramId,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Вы уже подали заявку на эту вакансию");
        }
        throw error;
      }

      return { application };
    }

    if (action === "list") {
      const { for_owner } = data;

      let query = supabase.from("applications").select("*");

      if (for_owner) {
        // Owner wants to see applications on their vacancies
        query = query.eq("vacancy:vacancies.owner_telegram_id", telegramId);
      } else {
        // Freelancer wants to see their own applications
        query = query.eq("freelancer_telegram_id", telegramId);
      }

      const { data: applications, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return { applications: applications || [] };
    }

    if (action === "get") {
      const { id } = data;
      const { data: application, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return { application: application || null };
    }

    if (action === "update") {
      const { id, status } = data;

      const { data: application, error } = await supabase
        .from("applications")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { application };
    }

    if (action === "withdraw") {
      const { id } = data;

      const { data: application, error } = await supabase
        .from("applications")
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("freelancer_telegram_id", telegramId)
        .select()
        .single();

      if (error) throw error;
      return { application };
    }

    throw new Error("Unknown action");
  })
);
