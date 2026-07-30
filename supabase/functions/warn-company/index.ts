import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";
import { requireModerator, warnSubject } from "../_shared/moderation.ts";

// Раньше предупреждение только писалось в лог и терялось. Теперь оно сохраняется
// в moderation_warnings, а после трёх предупреждений компания блокируется на 7 дней.
Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const moderator = await requireModerator(supabase, telegramId);

    const { owner_id, reason, severity = "mild" } = body as {
      owner_id: string;
      reason: string;
      severity?: "mild" | "moderate" | "severe";
    };

    if (!owner_id) {
      throw new Error("Не указан owner_id");
    }

    const { data: company, error } = await supabase
      .from("owner_profiles")
      .select("id, telegram_id")
      .eq("id", owner_id)
      .maybeSingle();

    if (error) {
      throw new Error(`Не удалось найти компанию: ${error.message}`);
    }
    if (!company) {
      throw new Error("Компания не найдена");
    }

    return await warnSubject(supabase, moderator, {
      subjectType: "company",
      subjectId: company.id,
      subjectTelegramId: company.telegram_id,
      reason,
      severity,
    });
  })
);
