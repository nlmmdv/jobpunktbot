import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

const ADMIN_TELEGRAM_IDS = [406489240];

async function warnCompany(
  supabase: any,
  adminTelegramId: number,
  body: Record<string, unknown>
) {
  const { owner_id, reason, severity = "mild" } = body as {
    owner_id: string;
    reason: string;
    severity?: "mild" | "moderate" | "severe";
  };

  if (!owner_id || !reason) {
    throw new Error("Missing required fields: owner_id, reason");
  }

  if (!["mild", "moderate", "severe"].includes(severity)) {
    throw new Error("Invalid severity. Must be: mild, moderate, severe");
  }

  // Проверить что админ авторизован
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("telegram_id", adminTelegramId)
    .single();

  if (adminError || !adminProfile || adminProfile.role !== "admin") {
    throw new Error("Only admins can warn companies (403)");
  }

  if (!ADMIN_TELEGRAM_IDS.includes(adminTelegramId)) {
    throw new Error("Not authorized to warn companies (403)");
  }

  // Проверить что компания существует
  const { data: company } = await supabase
    .from("owner_profiles")
    .select("id, status")
    .eq("id", owner_id)
    .single();

  if (!company) {
    throw new Error("Company not found");
  }

  console.log(`[Moderation] Warned company ${owner_id}: ${reason} (severity: ${severity})`);

  return {
    warning: {
      id: `warning-${Date.now()}`,
      company_id: owner_id,
      reason,
      severity,
      created_at: new Date().toISOString(),
    },
    auto_blocked: false,
  };
}

Deno.serve((req) => handleEdgeFunction(req, warnCompany));
