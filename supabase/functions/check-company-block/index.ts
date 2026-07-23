import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

async function checkCompanyBlock(supabase: any, body: Record<string, unknown>) {
  const { owner_id } = body as { owner_id: string };

  if (!owner_id) {
    throw new Error("Missing owner_id");
  }

  // Проверить статус компании
  const { data: company, error } = await supabase
    .from("owner_profiles")
    .select("id, status")
    .eq("id", owner_id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to check company: ${error.message}`);
  }

  const isBlocked = company?.status === "blocked";

  return {
    is_blocked: isBlocked,
    company_id: owner_id,
  };
}

Deno.serve((req) => handlePublicEdgeFunction(req, checkCompanyBlock));
