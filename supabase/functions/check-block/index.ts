import { handleModeratorRequest } from "../_shared/moderator-handler.ts";
import { blockStatusFor } from "../_shared/moderation.ts";

// Проверка блокировки при входе в приложение. Кого проверять — определяется по
// подписанному telegram_id из initData, поэтому параметров нет и чужой статус
// запросить нельзя.
//
// Работает одинаково для владельца и фрилансера: блокируется аккаунт, а не роль.
Deno.serve((req) =>
  handleModeratorRequest(req, async (supabase, telegramId, _body) => {
    return await blockStatusFor(supabase, telegramId);
  })
);
