import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, _telegramId, body) => {
    const { user_id } = body as { user_id: string };

    // Get complaints against this user
    const { data: complaints, error } = await supabase
      .from("complaints")
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
      .eq("reported_user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching complaints:", error);
      throw error;
    }

    return { complaints: complaints || [] };
  })
);
