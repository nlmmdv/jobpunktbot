import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

async function listCompanies(supabase: any, body: Record<string, unknown>) {
  const { search, limit = 50, offset = 0 } = body as {
    search?: string;
    limit?: number;
    offset?: number;
  };

  let query = supabase
    .from("owner_profiles")
    .select("id, telegram_id, organization_name, phone, city, status, created_at")
    .order("created_at", { ascending: false });

  if (search) {
    const searchLower = search.toLowerCase();
    query = query.or(
      `organization_name.ilike.%${searchLower}%,city.ilike.%${searchLower}%,telegram_id.eq.${search}`
    );
  }

  query = query.range(offset as number, (offset as number) + (limit as number) - 1);

  const { data: companies, error } = await query;

  if (error) {
    throw new Error(`Failed to load companies: ${error.message}`);
  }

  return { companies: companies || [] };
}

Deno.serve((req) => handlePublicEdgeFunction(req, listCompanies));
