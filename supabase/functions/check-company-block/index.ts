import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";
import { checkBlockStatus } from "../_shared/moderation.ts";

// Проверка блокировки на входе в приложение. Имя функции историческое —
// она проверяет и самого пользователя, и его компанию за один вызов.
//
// Субъекты определяются по проверенному telegram_id из подписи initData, поэтому
// параметров не требуется и чужую блокировку запросить нельзя.
//
// Источник правды — moderation_blocks (учитывает срок действия и снятие вручную),
// а не owner_profiles.status: этот CHECK-констрейнт принадлежит общей платформе.
Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, _body) => {
    const [{ data: profile }, { data: company }] = await Promise.all([
      supabase.from("profiles").select("id").eq("telegram_id", telegramId).maybeSingle(),
      supabase.from("owner_profiles").select("id").eq("telegram_id", telegramId).maybeSingle(),
    ]);

    const [userStatus, companyStatus] = await Promise.all([
      profile
        ? checkBlockStatus(supabase, "user", profile.id)
        : Promise.resolve({ is_blocked: false, blocks: [] }),
      company
        ? checkBlockStatus(supabase, "company", company.id)
        : Promise.resolve({ is_blocked: false, blocks: [] }),
    ]);

    return {
      is_blocked: userStatus.is_blocked || companyStatus.is_blocked,
      blocked_subject: userStatus.is_blocked ? "user" : companyStatus.is_blocked ? "company" : null,
      blocks: [...userStatus.blocks, ...companyStatus.blocks],
    };
  })
);
