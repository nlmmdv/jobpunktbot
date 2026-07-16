import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handlePublicEdgeFunction(req, async (supabase, body) => {
    const { type, city, marketplaces, limit = 20, offset = 0 } = body;

    if (!type || !["temporary", "permanent"].includes(type)) {
      throw new Error("Invalid type");
    }

    let query = supabase
      .from("owner_vacancies")
      .select("*")
      .eq("type", type)
      .eq("status", "active")
      .range(offset as number, (offset as number) + (limit as number) - 1)
      .order("created_at", { ascending: false });

    if (city && city !== "Все") {
      query = query.eq("city", city);
    }

    if (marketplaces && (marketplaces as string[]).length > 0) {
      query = query.contains("marketplaces", marketplaces);
    }

    const { data: vacancies, error } = await query;

    if (error) throw error;

    return { vacancies: vacancies || [] };
  })
);
