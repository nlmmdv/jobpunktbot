import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, _telegramId, body) => {
    const { company_id } = body as { company_id: string };

    // Get complaints against this company
    const { data: complaints, error } = await supabase
      .from("company_complaints")
      .select(
        `
        id,
        reason,
        description,
        status,
        created_at,
        reported_by (
          id,
          first_name,
          last_name,
          telegram_id
        )
      `
      )
      .eq("reported_company_id", company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching company complaints:", error);
      throw error;
    }

    return { complaints: complaints || [] };
  })
);
