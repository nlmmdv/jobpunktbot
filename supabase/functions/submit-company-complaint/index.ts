import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { reported_company_id, owner_telegram_id, reason, description } = body as {
      reported_company_id?: string;
      owner_telegram_id?: number | string;
      reason: string;
      description?: string;
    };

    if (!reason) {
      throw new Error("Не указана причина жалобы");
    }

    // Автор жалобы — по проверенной подписи Telegram, а не по данным из тела.
    const { data: reportingUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (userError || !reportingUser) {
      console.error("Could not find reporting user:", userError);
      throw new Error("Профиль автора жалобы не найден");
    }

    // Клиент видит только telegram_id владельца (он есть в карточке вакансии),
    // а в колонке лежит uuid из owner_profiles — резолвим здесь, иначе вставка
    // упадёт на несовпадении типов.
    let companyId: string | null = null;

    if (reported_company_id && UUID_RE.test(reported_company_id)) {
      companyId = reported_company_id;
    } else {
      const rawTelegramId = owner_telegram_id ?? reported_company_id;
      const ownerTelegramId = Number(rawTelegramId);

      if (!rawTelegramId || !Number.isFinite(ownerTelegramId)) {
        throw new Error("Нужен owner_telegram_id или reported_company_id");
      }

      const { data: company } = await supabase
        .from("owner_profiles")
        .select("id")
        .eq("telegram_id", ownerTelegramId)
        .maybeSingle();

      if (!company) {
        throw new Error("Компания не найдена");
      }
      companyId = company.id;
    }

    if (reportingUser.id === companyId) {
      throw new Error("Нельзя пожаловаться на самого себя");
    }

    const { data: complaint, error: insertError } = await supabase
      .from("company_complaints")
      .insert({
        reported_by: reportingUser.id,
        reported_company_id: companyId,
        reason,
        description: description || null,
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting company complaint:", insertError);
      throw insertError;
    }

    console.log(`✅ Company complaint created: ${complaint.id} by user ${reportingUser.id}`);
    return { complaint };
  })
);
