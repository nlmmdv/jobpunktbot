import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";
import {
  getActiveBlocks,
  getOpenComplaintCounts,
  getWarningCounts,
  requireModerator,
  sanitizeSearchTerm,
} from "../_shared/moderation.ts";

// Раньше функция была публичной и ходила в БД под service_role — то есть любой
// желающий мог выгрузить все компании вместе с телефонами. Теперь требуется
// подтверждённый Telegram-аккаунт с ролью администратора.
Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    await requireModerator(supabase, telegramId);

    const { search, limit = 50, offset = 0 } = body as {
      search?: string;
      limit?: number;
      offset?: number;
    };

    // ПВЗ — профиль владельца: отдельной таблицы компаний в проде нет.
    let query = supabase
      .from("profiles")
      .select("id, telegram_id, first_name, last_name, phone, city, status, created_at")
      .eq("role", "owner")
      .order("created_at", { ascending: false });

    if (search) {
      const term = sanitizeSearchTerm(search);
      const numeric = /^\d+$/.test(term);
      query = query.or(
        [
          `first_name.ilike.%${term}%`,
          `last_name.ilike.%${term}%`,
          `city.ilike.%${term}%`,
          ...(numeric ? [`telegram_id.eq.${term}`] : []),
        ].join(",")
      );
    }

    const { data: companies, error } = await query.range(
      Number(offset),
      Number(offset) + Number(limit) - 1
    );

    if (error) {
      throw new Error(`Не удалось загрузить компании: ${error.message}`);
    }

    const ids = (companies || []).map((c: any) => c.id);
    const [blocks, warnings, complaints] = await Promise.all([
      getActiveBlocks(supabase, "company", ids),
      getWarningCounts(supabase, "company", ids),
      getOpenComplaintCounts(supabase, "company", ids),
    ]);

    return {
      companies: (companies || []).map((c: any) => ({
        ...c,
        organization_name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Без названия",
        is_blocked: blocks.has(c.id),
        block: blocks.get(c.id) || null,
        warning_count: warnings.get(c.id) || 0,
        open_complaints: complaints.get(c.id) || 0,
      })),
    };
  })
);
