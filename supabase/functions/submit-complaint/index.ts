import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { reported_user_id, reason, description } = body as {
      reported_user_id: string;
      reason: string;
      description?: string;
    };

    // Get the reporting user's ID from telegram_id
    const { data: reportingUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !reportingUser) {
      console.error("Could not find reporting user:", userError);
      throw new Error("User not found");
    }

    // Validate that they're not reporting themselves
    if (reportingUser.id === reported_user_id) {
      throw new Error("Cannot report yourself");
    }

    // Insert complaint
    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert({
        reported_by: reportingUser.id,
        reported_user_id,
        reason,
        description: description || null,
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting complaint:", insertError);
      throw insertError;
    }

    console.log(`✅ Complaint created: ${complaint.id} by user ${reportingUser.id}`);
    return { complaint };
  })
);
