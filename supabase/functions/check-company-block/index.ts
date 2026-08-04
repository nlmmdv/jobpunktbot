import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";
import { checkBlockStatus } from "../_shared/moderation.ts";

// Проверка блокировки на входе в приложение. Имя функции историческое —
// она проверяет и самого пользователя, и его компанию за один вызов.
//
// Субъекты определяются по проверенному telegram_id из подписи initData, поэтому
// параметров не требуется и чужую блокировку запросить нельзя.
//
// Источник правды — moderation_blocks (учитывает срок действия и снятие вручную),
// а не profiles.status: этот CHECK-констрейнт принадлежит общей платформе.
Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, _body) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (!profile) {
      return { is_blocked: false, blocked_subject: null, blocks: [] };
    }

    // ПВЗ — это профиль владельца, отдельной таблицы компаний нет. Поэтому
    // проверяем оба типа блокировки по одному и тому же profiles.id: 'user'
    // ставится в разделе пользователей, 'company' — в разделе компаний.
    const [userStatus, companyStatus] = await Promise.all([
      checkBlockStatus(supabase, "user", profile.id),
      profile.role === "owner"
        ? checkBlockStatus(supabase, "company", profile.id)
        : Promise.resolve({ is_blocked: false, blocks: [] }),
    ]);

    return {
      is_blocked: userStatus.is_blocked || companyStatus.is_blocked,
      blocked_subject: userStatus.is_blocked ? "user" : companyStatus.is_blocked ? "company" : null,
      blocks: [...userStatus.blocks, ...companyStatus.blocks],
    };
  })
);
