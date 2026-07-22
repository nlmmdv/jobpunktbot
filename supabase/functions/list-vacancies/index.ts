import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

Deno.serve((req) =>
  handlePublicEdgeFunction(req, async (supabase, body) => {
    const { type, city, marketplaces, limit = 20, offset = 0 } = body;

    if (!type || !["temporary", "permanent"].includes(type)) {
      throw new Error("Invalid type");
    }

    // Получить заблокированные компании
    const now = new Date().toISOString();
    const { data: blockedCompanies } = await supabase
      .from('company_blocks')
      .select('blocked_company_id')
      .eq('status', 'active')
      .or(`unblock_at.is.null,unblock_at.gt.${now}`);

    const blockedCompanyIds = blockedCompanies?.map(b => b.blocked_company_id) || [];

    let query = supabase
      .from("owner_vacancies")
      .select("*")
      .eq("type", type)
      .eq("status", "active");

    // Исключить вакансии заблокированных компаний
    if (blockedCompanyIds.length > 0) {
      query = query.not('owner_id', 'in', `(${blockedCompanyIds.join(',')})`);
    }

    query = query
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
