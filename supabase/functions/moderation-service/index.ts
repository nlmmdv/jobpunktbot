import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";
import {
  blockSubject,
  getActiveBlocks,
  getOpenComplaintCounts,
  getWarningCounts,
  logAction,
  requireModerator,
  sanitizeSearchTerm,
  unblockSubject,
  warnSubject,
} from "../_shared/moderation.ts";

const SPAM_KEYWORDS = [
  "whatsapp", "telegram", "viber", "signal",
  "http", "https", "://",
  "контакт", "звони", "пиши", "звонок",
  "+7", "+8", "89", "79",
  "icq", "skype", "discord",
];

function checkForSpam(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SPAM_KEYWORDS.some((keyword) => lower.includes(keyword));
}

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const {
      action,
      limit = 50,
      offset = 0,
      search,
      vacancyId,
      userId,
      ownerId,
      reason,
      severity,
      durationMinutes,
      complaintId,
    } = body as Record<string, any>;

    const moderator = await requireModerator(supabase, telegramId);
    const range = [Number(offset), Number(offset) + Number(limit) - 1] as const;

    // ------------------------------------------------------------------
    // Пользователи
    // ------------------------------------------------------------------
    if (action === "list_users") {
      let query = supabase
        .from("profiles")
        .select("id, telegram_id, first_name, last_name, role, city, status, created_at")
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

      const { data: users, error } = await query.range(...range);
      if (error) throw new Error(`Не удалось загрузить пользователей: ${error.message}`);

      const ids = (users || []).map((u: any) => u.id);
      const [blocks, warnings, complaints] = await Promise.all([
        getActiveBlocks(supabase, "user", ids),
        getWarningCounts(supabase, "user", ids),
        getOpenComplaintCounts(supabase, "user", ids),
      ]);

      return {
        users: (users || []).map((u: any) => ({
          ...u,
          is_blocked: blocks.has(u.id),
          block: blocks.get(u.id) || null,
          warning_count: warnings.get(u.id) || 0,
          open_complaints: complaints.get(u.id) || 0,
        })),
      };
    }

    if (action === "block_user") {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, telegram_id")
        .eq("id", userId)
        .maybeSingle();
      if (!target) throw new Error("Пользователь не найден");

      const block = await blockSubject(supabase, moderator, {
        subjectType: "user",
        subjectId: target.id,
        subjectTelegramId: target.telegram_id,
        reason: reason || "Блокировка администратором",
        durationMinutes: Number(durationMinutes) || 0,
      });
      return { block };
    }

    if (action === "unblock_user") {
      return await unblockSubject(supabase, moderator, "user", userId);
    }

    if (action === "warn_user") {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, telegram_id")
        .eq("id", userId)
        .maybeSingle();
      if (!target) throw new Error("Пользователь не найден");

      return await warnSubject(supabase, moderator, {
        subjectType: "user",
        subjectId: target.id,
        subjectTelegramId: target.telegram_id,
        reason: reason || "Предупреждение администратором",
        severity,
      });
    }

    // ------------------------------------------------------------------
    // Компании
    // ------------------------------------------------------------------
    if (action === "list_companies") {
      let query = supabase
        .from("owner_profiles")
        .select("id, telegram_id, organization_name, phone, city, status, created_at")
        .order("created_at", { ascending: false });

      if (search) {
        const term = sanitizeSearchTerm(search);
        const numeric = /^\d+$/.test(term);
        query = query.or(
          [
            `organization_name.ilike.%${term}%`,
            `city.ilike.%${term}%`,
            ...(numeric ? [`telegram_id.eq.${term}`] : []),
          ].join(",")
        );
      }

      const { data: companies, error } = await query.range(...range);
      if (error) throw new Error(`Не удалось загрузить компании: ${error.message}`);

      const ids = (companies || []).map((c: any) => c.id);
      const [blocks, warnings, complaints] = await Promise.all([
        getActiveBlocks(supabase, "company", ids),
        getWarningCounts(supabase, "company", ids),
        getOpenComplaintCounts(supabase, "company", ids),
      ]);

      return {
        companies: (companies || []).map((c: any) => ({
          ...c,
          is_blocked: blocks.has(c.id),
          block: blocks.get(c.id) || null,
          warning_count: warnings.get(c.id) || 0,
          open_complaints: complaints.get(c.id) || 0,
        })),
      };
    }

    if (action === "block_company") {
      const { data: target } = await supabase
        .from("owner_profiles")
        .select("id, telegram_id")
        .eq("id", ownerId)
        .maybeSingle();
      if (!target) throw new Error("Компания не найдена");

      const block = await blockSubject(supabase, moderator, {
        subjectType: "company",
        subjectId: target.id,
        subjectTelegramId: target.telegram_id,
        reason: reason || "Блокировка администратором",
        durationMinutes: Number(durationMinutes) || 0,
      });
      return { block };
    }

    if (action === "unblock_company") {
      return await unblockSubject(supabase, moderator, "company", ownerId);
    }

    if (action === "warn_company") {
      const { data: target } = await supabase
        .from("owner_profiles")
        .select("id, telegram_id")
        .eq("id", ownerId)
        .maybeSingle();
      if (!target) throw new Error("Компания не найдена");

      return await warnSubject(supabase, moderator, {
        subjectType: "company",
        subjectId: target.id,
        subjectTelegramId: target.telegram_id,
        reason: reason || "Предупреждение администратором",
        severity,
      });
    }

    // ------------------------------------------------------------------
    // Жалобы
    // ------------------------------------------------------------------
    if (action === "user_complaints" || action === "company_complaints") {
      const isCompany = action === "company_complaints";
      const table = isCompany ? "company_complaints" : "complaints";
      const column = isCompany ? "reported_company_id" : "reported_user_id";
      const subjectId = isCompany ? ownerId : userId;

      if (!subjectId) throw new Error("Не указан идентификатор субъекта");

      const { data: rows, error } = await supabase
        .from(table)
        .select("id, reason, description, status, created_at, reported_by")
        .eq(column, subjectId)
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (error) throw new Error(`Не удалось загрузить жалобы: ${error.message}`);

      // Автора жалобы подтягиваем отдельным запросом: FK на profiles в схеме нет,
      // поэтому встроенный join PostgREST здесь недоступен.
      const authorIds = [...new Set((rows || []).map((r: any) => r.reported_by))];
      const authors = new Map<string, any>();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, telegram_id")
          .in("id", authorIds);
        for (const p of profiles || []) authors.set(p.id, p);
      }

      return {
        complaints: (rows || []).map((r: any) => ({
          ...r,
          reported_by: authors.get(r.reported_by) || {
            id: r.reported_by,
            first_name: "Неизвестно",
            telegram_id: 0,
          },
        })),
      };
    }

    if (action === "resolve_complaint") {
      const { subjectType } = body as { subjectType?: string };
      const table = subjectType === "company" ? "company_complaints" : "complaints";
      if (!complaintId) throw new Error("Не указан complaintId");

      const { error } = await supabase
        .from(table)
        .update({
          status: "resolved",
          resolved_by: moderator.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", complaintId);

      if (error) throw new Error(`Не удалось закрыть жалобу: ${error.message}`);

      await logAction(supabase, moderator, "resolve_complaint", null, complaintId, { table });
      return { success: true };
    }

    // ------------------------------------------------------------------
    // Новые пользователи и вакансии на проверку
    // ------------------------------------------------------------------
    if (action === "new_users") {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: newUsers, error } = await supabase
        .from("profiles")
        .select("id, telegram_id, first_name, last_name, role, city, created_at")
        .gt("created_at", yesterday)
        .order("created_at", { ascending: false })
        .range(...range);

      if (error) throw new Error(`Не удалось загрузить новых пользователей: ${error.message}`);

      // Резюме подтягиваем одним запросом вместо N+1 по каждому пользователю.
      const telegramIds = (newUsers || []).map((u: any) => u.telegram_id);
      const abouts = new Map<number, string | null>();
      if (telegramIds.length > 0) {
        const { data: resumes } = await supabase
          .from("freelancer_resumes")
          .select("telegram_id, about")
          .in("telegram_id", telegramIds);
        for (const r of resumes || []) abouts.set(r.telegram_id, r.about);
      }

      return {
        users: (newUsers || []).map((u: any) => ({
          ...u,
          about: abouts.get(u.telegram_id) ?? null,
          has_spam: checkForSpam(abouts.get(u.telegram_id)),
        })),
      };
    }

    if (action === "vacancies_for_review") {
      // Прод-таблица — owner_vacancies, владелец в ней telegram_id, колонки
      // title нет, статусы 'active' | 'deleted' (см. owner-vacancies/index.ts).
      const { data: vacancies, error } = await supabase
        .from("owner_vacancies")
        .select("id, address, description, telegram_id, status, payment, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(...range);

      if (error) throw new Error(`Не удалось загрузить вакансии: ${error.message}`);

      const ownerIds = [...new Set((vacancies || []).map((v: any) => v.telegram_id))];
      const owners = new Map<number, string>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("telegram_id, first_name")
          .in("telegram_id", ownerIds);
        for (const p of profiles || []) owners.set(p.telegram_id, p.first_name);
      }

      return {
        vacancies: (vacancies || []).map((v: any) => ({
          id: v.id,
          address: v.address,
          description: v.description,
          payment: v.payment,
          telegram_id: v.telegram_id,
          first_name: owners.get(v.telegram_id) || null,
          created_at: v.created_at,
          has_spam: checkForSpam(v.description),
        })),
      };
    }

    // ------------------------------------------------------------------
    // Действия над вакансиями
    // ------------------------------------------------------------------
    if (action === "delete_vacancy") {
      if (!vacancyId) throw new Error("Не указан vacancyId");

      const { error } = await supabase
        .from("owner_vacancies")
        .update({ status: "deleted" })
        .eq("id", vacancyId);

      if (error) throw new Error(`Не удалось снять вакансию: ${error.message}`);

      await logAction(supabase, moderator, "remove_vacancy", null, vacancyId, { reason });
      return { success: true, message: "Вакансия снята с публикации" };
    }

    if (action === "approve_vacancy") {
      if (!vacancyId) throw new Error("Не указан vacancyId");
      // Одобрение не меняет статус (вакансия уже 'active') — фиксируем в журнале,
      // чтобы модератор видел, что заявка проверена.
      await logAction(supabase, moderator, "approve_vacancy", null, vacancyId, {});
      return { success: true, message: "Вакансия одобрена" };
    }

    // Обратная совместимость: старое имя действия из первой версии дашборда.
    if (action === "ban_user") {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, telegram_id")
        .eq("telegram_id", userId)
        .maybeSingle();
      if (!target) throw new Error("Пользователь не найден");

      const block = await blockSubject(supabase, moderator, {
        subjectType: "user",
        subjectId: target.id,
        subjectTelegramId: target.telegram_id,
        reason: reason || "Блокировка из дашборда модерации",
      });
      return { success: true, block };
    }

    // ------------------------------------------------------------------
    // Статистика
    // ------------------------------------------------------------------
    if (action === "stats") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const today = todayStart.toISOString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      const [newUsers, newVacancies, matches, spamSource, openComplaints, companyComplaints, blocks] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
          supabase.from("owner_vacancies").select("*", { count: "exact", head: true }).gte("created_at", today),
          supabase.from("job_matches").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
          supabase.from("owner_vacancies").select("description").eq("status", "active"),
          supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("company_complaints").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase
            .from("moderation_blocks")
            .select("*", { count: "exact", head: true })
            .is("lifted_at", null)
            .or(`expires_at.is.null,expires_at.gt.${now}`),
        ]);

      const suspicious = (spamSource.data || []).filter((v: any) => checkForSpam(v.description)).length;

      return {
        stats: {
          new_users_today: newUsers.count || 0,
          new_vacancies_today: newVacancies.count || 0,
          matches_this_week: matches.count || 0,
          suspicious_vacancies: suspicious,
          open_complaints: (openComplaints.count || 0) + (companyComplaints.count || 0),
          active_blocks: blocks.count || 0,
        },
      };
    }

    throw new Error(`Неизвестное действие: ${action}`);
  })
);
