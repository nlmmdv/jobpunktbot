import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

const ADMIN_TELEGRAM_IDS = [406489240]; // Админы, которые могут модерировать

async function blockCompany(
  supabase: any,
  adminTelegramId: number,
  body: Record<string, unknown>
) {
  // Проверить что админ авторизован
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("telegram_id", adminTelegramId)
    .single();

  if (adminError || !adminProfile) {
    throw new Error("Admin profile not found");
  }

  if (adminProfile.role !== "admin") {
    throw new Error("Only admins can block companies (403)");
  }

  if (!ADMIN_TELEGRAM_IDS.includes(adminTelegramId)) {
    throw new Error("Not authorized to block companies (403)");
  }

  const { owner_id, duration_minutes, reason } = body as {
    owner_id: string;
    duration_minutes: number;
    reason: string;
  };

  if (!owner_id || duration_minutes === undefined || !reason) {
    throw new Error("Missing required fields: owner_id, duration_minutes, reason");
  }

  // Проверить что компания существует
  const { data: company, error: companyError } = await supabase
    .from("owner_profiles")
    .select("id, status")
    .eq("id", owner_id)
    .single();

  if (companyError || !company) {
    throw new Error("Company not found");
  }

  if (company.status === "blocked") {
    throw new Error("Company is already blocked");
  }

  // Блокировать компанию (обновить статус в owner_profiles)
  const { data: updated, error: updateError } = await supabase
    .from("owner_profiles")
    .update({ status: "blocked" })
    .eq("id", owner_id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to block company: ${updateError.message}`);
  }

  return { block: updated };
}

Deno.serve((req) => handleEdgeFunction(req, blockCompany));
