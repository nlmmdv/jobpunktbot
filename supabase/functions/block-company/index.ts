import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";
import { blockSubject, requireModerator, unblockSubject } from "../_shared/moderation.ts";

// Права проверяются по роли в БД, а не по захардкоженному списку telegram_id.
Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const moderator = await requireModerator(supabase, telegramId);

    const { owner_id, duration_minutes, reason, unblock } = body as {
      owner_id: string;
      duration_minutes?: number;
      reason?: string;
      unblock?: boolean;
    };

    if (!owner_id) {
      throw new Error("Не указан owner_id");
    }

    // Компания = профиль владельца: отдельной таблицы ПВЗ в проде нет.
    const { data: company, error: companyError } = await supabase
      .from("profiles")
      .select("id, telegram_id, first_name")
      .eq("id", owner_id)
      .eq("role", "owner")
      .maybeSingle();

    if (companyError) {
      throw new Error(`Не удалось найти компанию: ${companyError.message}`);
    }
    if (!company) {
      throw new Error("Компания не найдена");
    }

    if (unblock) {
      return await unblockSubject(supabase, moderator, "company", company.id);
    }

    if (!reason) {
      throw new Error("Не указана причина блокировки");
    }

    const block = await blockSubject(supabase, moderator, {
      subjectType: "company",
      subjectId: company.id,
      subjectTelegramId: company.telegram_id,
      reason,
      durationMinutes: Number(duration_minutes) || 0,
    });

    return { block };
  })
);
