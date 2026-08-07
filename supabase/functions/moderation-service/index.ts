import { handleModeratorRequest } from "../_shared/moderator-handler.ts";
import {
  activeBlocks,
  blockAccount,
  logAction,
  requireModerator,
  sanitizeSearch,
  unblockAccount,
} from "../_shared/moderation.ts";

// Таблицы прода: вакансии — owner_vacancies (владелец в них telegram_id, колонки
// title нет, статусы 'active' | 'deleted'). Внешнего ключа job_matches -> profiles
// нет, поэтому имена участников подтягиваем отдельным запросом, а не эмбедом.
const VACANCY_EMBED = "id, address, payment, date, start_time, end_time";

/** Момент начала смены. Время хранится без зоны и заведено в московском. */
function shiftStart(date?: string | null, startTime?: string | null): number | null {
  if (!date) return null;
  const time = (startTime || "00:00:00").slice(0, 8).padEnd(8, ":00");
  const parsed = Date.parse(`${date}T${time}+03:00`);
  return Number.isFinite(parsed) ? parsed : null;
}

// deno-lint-ignore no-explicit-any
async function namesByTelegramId(supabase: any, ids: number[]) {
  const map = new Map<number, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("telegram_id, first_name, last_name")
    .in("telegram_id", unique);

  for (const p of data || []) {
    map.set(p.telegram_id, [p.first_name, p.last_name].filter(Boolean).join(" "));
  }
  return map;
}

Deno.serve((req) =>
  handleModeratorRequest(req, async (supabase, telegramId, body) => {
    const {
      action,
      search,
      role,
      subjectId,
      reason,
      durationMinutes,
      penaltyId,
      ratingId,
      shiftId,
      status,
      limit = 100,
    } = body as Record<string, any>;

    const moderator = await requireModerator(supabase, telegramId);

    // ------------------------------------------------------------------
    // Лента «требует внимания» — то, ради чего экран открывают
    // ------------------------------------------------------------------
    if (action === "attention") {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const now = Date.now();

      const [acceptedRes, newUsersRes, newVacanciesRes, blocksRes, incidentsRes] = await Promise.all([
        supabase
          .from("job_matches")
          .select(`id, confirmed_at, freelancer_telegram_id, owner_telegram_id, owner_vacancies ( ${VACANCY_EMBED} )`)
          .eq("status", "accepted"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", dayAgo),
        supabase
          .from("owner_vacancies")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .gte("created_at", dayAgo),
        supabase
          .from("moderation_blocks")
          .select("*", { count: "exact", head: true })
          .is("lifted_at", null)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
        // Неявки, подтверждённые владельцем, — самый весомый сигнал в ленте:
        // это не подозрение системы, а факт от пострадавшей стороны.
        supabase
          .from("shift_incidents")
          .select("id, match_id, kind, description, reported_by_telegram_id, subject_telegram_id, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const accepted = acceptedRes.data || [];

      // Смена началась, а выход не отмечен — главный сигнал, что что-то пошло не так.
      const unconfirmed = accepted.filter((m: any) => {
        if (m.confirmed_at) return false;
        const start = shiftStart(m.owner_vacancies?.date, m.owner_vacancies?.start_time);
        return start !== null && start < now && m.owner_vacancies?.date >= since;
      });

      const running = accepted.filter((m: any) => {
        const start = shiftStart(m.owner_vacancies?.date, m.owner_vacancies?.start_time);
        const end = shiftStart(m.owner_vacancies?.date, m.owner_vacancies?.end_time);
        return start !== null && start <= now && (end === null || end > now);
      });

      const openIncidents = incidentsRes.data || [];

      const names = await namesByTelegramId(supabase, [
        ...unconfirmed.flatMap((m: any) => [m.freelancer_telegram_id, m.owner_telegram_id]),
        ...openIncidents.flatMap((i: any) => [i.subject_telegram_id, i.reported_by_telegram_id]),
      ]);

      return {
        attention: {
          incidents_count: openIncidents.length,
          incidents: openIncidents.map((i: any) => ({
            id: i.id,
            match_id: i.match_id,
            description: i.description,
            subject_name: names.get(i.subject_telegram_id) ?? null,
            subject_telegram_id: i.subject_telegram_id,
            reporter_name: names.get(i.reported_by_telegram_id) ?? null,
            created_at: i.created_at,
          })),
          unconfirmed_count: unconfirmed.length,
          unconfirmed: unconfirmed.slice(0, 10).map((m: any) => ({
            id: m.id,
            address: m.owner_vacancies?.address ?? null,
            date: m.owner_vacancies?.date ?? null,
            start_time: m.owner_vacancies?.start_time ?? null,
            freelancer_name: names.get(m.freelancer_telegram_id) ?? null,
            freelancer_telegram_id: m.freelancer_telegram_id,
            owner_name: names.get(m.owner_telegram_id) ?? null,
          })),
          running_now: running.length,
          new_users_24h: newUsersRes.count || 0,
          new_vacancies_24h: newVacanciesRes.count || 0,
          active_blocks: blocksRes.count || 0,
        },
      };
    }

    // ------------------------------------------------------------------
    // Люди: владельцы и фрилансеры в одном списке
    // ------------------------------------------------------------------
    if (action === "list_people") {
      let query = supabase
        .from("profiles")
        .select("id, telegram_id, first_name, last_name, role, city, phone, status, created_at")
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      // role: 'employee' | 'owner' | 'all'
      if (role && role !== "all") query = query.eq("role", role);

      if (search) {
        const term = sanitizeSearch(search);
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

      const { data: people, error } = await query;
      if (error) throw new Error(`Не удалось загрузить людей: ${error.message}`);

      const blocks = await activeBlocks(supabase, (people || []).map((p: any) => p.id));

      return {
        people: (people || []).map((p: any) => ({
          ...p,
          full_name: [p.first_name, p.last_name].filter(Boolean).join(" "),
          is_blocked: blocks.has(p.id),
          block: blocks.get(p.id) || null,
        })),
      };
    }

    // Карточка человека: штрафы и полученные оценки — то, что модератор может отменить.
    if (action === "person_detail") {
      if (!subjectId) throw new Error("Не указан пользователь");

      const { data: person } = await supabase
        .from("profiles")
        .select("id, telegram_id, first_name, last_name, role, city, phone, created_at")
        .eq("id", subjectId)
        .maybeSingle();

      if (!person) throw new Error("Пользователь не найден");

      const [penaltiesRes, ratingsRes, blocksHistoryRes] = await Promise.all([
        supabase
          .from("cancellation_penalties")
          .select("id, penalty, reason, hours_before, created_at")
          .eq("telegram_id", person.telegram_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("ratings")
          .select("id, rating, comment, from_telegram_id, created_at")
          .eq("to_telegram_id", person.telegram_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("moderation_blocks")
          .select("id, reason, expires_at, lifted_at, created_at")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Штрафы живут в таблице, которую не создаёт ни одна миграция: если её нет,
      // карточка всё равно должна открываться.
      if (penaltiesRes.error) console.error("penalties:", penaltiesRes.error.message);
      if (ratingsRes.error) console.error("ratings:", ratingsRes.error.message);

      const authorNames = await namesByTelegramId(
        supabase,
        (ratingsRes.data || []).map((r: any) => r.from_telegram_id)
      );

      return {
        person: {
          ...person,
          full_name: [person.first_name, person.last_name].filter(Boolean).join(" "),
        },
        penalties: penaltiesRes.data || [],
        ratings: (ratingsRes.data || []).map((r: any) => ({
          ...r,
          from_name: authorNames.get(r.from_telegram_id) ?? null,
        })),
        blocks: blocksHistoryRes.data || [],
      };
    }

    // ------------------------------------------------------------------
    // Блокировка аккаунта — одинаково для владельца и фрилансера
    // ------------------------------------------------------------------
    if (action === "block") {
      return await blockAccount(supabase, moderator, {
        subjectId,
        reason,
        durationMinutes: Number(durationMinutes) || 0,
      });
    }

    if (action === "unblock") {
      return await unblockAccount(supabase, moderator, subjectId);
    }

    // ------------------------------------------------------------------
    // Отмена автоматики: штраф за отмену смены и оценка
    // Удаляем строку, но снимок кладём в журнал — иначе решение не разобрать.
    // ------------------------------------------------------------------
    if (action === "cancel_penalty") {
      if (!penaltyId) throw new Error("Не указан штраф");
      if (!reason?.trim()) throw new Error("Не указана причина отмены");

      const { data: penalty } = await supabase
        .from("cancellation_penalties")
        .select("*")
        .eq("id", penaltyId)
        .maybeSingle();

      if (!penalty) throw new Error("Штраф не найден");

      const { error } = await supabase.from("cancellation_penalties").delete().eq("id", penaltyId);
      if (error) throw new Error(`Не удалось снять штраф: ${error.message}`);

      await logAction(supabase, moderator, "cancel_penalty", {
        subjectId,
        subjectTelegramId: penalty.telegram_id,
        reason: reason.trim(),
        details: { removed: penalty },
      });

      return { success: true, message: "Штраф снят, рейтинг пересчитается" };
    }

    if (action === "delete_rating") {
      if (!ratingId) throw new Error("Не указана оценка");
      if (!reason?.trim()) throw new Error("Не указана причина отмены");

      const { data: rating } = await supabase
        .from("ratings")
        .select("*")
        .eq("id", ratingId)
        .maybeSingle();

      if (!rating) throw new Error("Оценка не найдена");

      const { error } = await supabase.from("ratings").delete().eq("id", ratingId);
      if (error) throw new Error(`Не удалось аннулировать оценку: ${error.message}`);

      await logAction(supabase, moderator, "delete_rating", {
        subjectId,
        subjectTelegramId: rating.to_telegram_id,
        reason: reason.trim(),
        details: { removed: rating },
      });

      return { success: true, message: "Оценка аннулирована" };
    }

    // ------------------------------------------------------------------
    // Смены
    // ------------------------------------------------------------------
    if (action === "list_shifts") {
      let query = supabase
        .from("job_matches")
        .select(
          `id, status, created_at, confirmed_at, owner_telegram_id, freelancer_telegram_id,
           owner_vacancies ( ${VACANCY_EMBED} )`
        )
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (status && status !== "all") query = query.eq("status", status);

      const { data: shifts, error } = await query;
      if (error) throw new Error(`Не удалось загрузить смены: ${error.message}`);

      const names = await namesByTelegramId(
        supabase,
        (shifts || []).flatMap((m: any) => [m.owner_telegram_id, m.freelancer_telegram_id])
      );

      return {
        shifts: (shifts || []).map((m: any) => ({
          id: m.id,
          status: m.status,
          confirmed_at: m.confirmed_at,
          created_at: m.created_at,
          owner_telegram_id: m.owner_telegram_id,
          freelancer_telegram_id: m.freelancer_telegram_id,
          owner_name: names.get(m.owner_telegram_id) ?? null,
          freelancer_name: names.get(m.freelancer_telegram_id) ?? null,
          address: m.owner_vacancies?.address ?? null,
          payment: m.owner_vacancies?.payment ?? null,
          date: m.owner_vacancies?.date ?? null,
          start_time: m.owner_vacancies?.start_time ?? null,
          end_time: m.owner_vacancies?.end_time ?? null,
        })),
      };
    }

    if (action === "cancel_shift") {
      if (!shiftId) throw new Error("Не указана смена");
      if (!reason?.trim()) throw new Error("Не указана причина отмены");

      const { error } = await supabase
        .from("job_matches")
        .update({ status: "cancelled", responded_at: new Date().toISOString() })
        .eq("id", shiftId);

      if (error) throw new Error(`Не удалось отменить смену: ${error.message}`);

      await logAction(supabase, moderator, "cancel_shift", {
        subjectId: shiftId,
        reason: reason.trim(),
      });
      return { success: true, message: "Смена отменена" };
    }

    // Полный список неявок для разбора: в ленте внимания их только десять и без
    // подробностей смены.
    if (action === "list_incidents") {
      let query = supabase
        .from("shift_incidents")
        .select("id, match_id, kind, description, status, reported_by_telegram_id, subject_telegram_id, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (status && status !== "all") query = query.eq("status", status);

      const { data: incidents, error } = await query;
      if (error) throw new Error(`Не удалось загрузить неявки: ${error.message}`);

      const rows = incidents || [];

      // Подробности смены подтягиваем отдельно: внешнего ключа
      // shift_incidents -> job_matches нет, эмбед PostgREST не построит.
      const matchIds = [...new Set(rows.map((i: any) => i.match_id))];
      const matches = new Map<string, any>();
      if (matchIds.length > 0) {
        const { data: matchRows } = await supabase
          .from("job_matches")
          .select(`id, status, owner_vacancies ( ${VACANCY_EMBED} )`)
          .in("id", matchIds);
        for (const m of matchRows || []) matches.set(m.id, m);
      }

      const names = await namesByTelegramId(
        supabase,
        rows.flatMap((i: any) => [i.subject_telegram_id, i.reported_by_telegram_id])
      );

      return {
        incidents: rows.map((i: any) => {
          const vacancy = matches.get(i.match_id)?.owner_vacancies;
          return {
            id: i.id,
            match_id: i.match_id,
            status: i.status,
            description: i.description,
            created_at: i.created_at,
            resolved_at: i.resolved_at,
            subject_name: names.get(i.subject_telegram_id) ?? null,
            subject_telegram_id: i.subject_telegram_id,
            reporter_name: names.get(i.reported_by_telegram_id) ?? null,
            address: vacancy?.address ?? null,
            date: vacancy?.date ?? null,
            start_time: vacancy?.start_time ?? null,
            end_time: vacancy?.end_time ?? null,
            payment: vacancy?.payment ?? null,
          };
        }),
      };
    }

    if (action === "resolve_incident") {
      const { incidentId } = body as any;
      if (!incidentId) throw new Error("Не указан инцидент");

      // rejected — владелец ошибся, неявки не было: сотрудник не должен
      // остаться с отметкой о срыве смены.
      const { rejected } = body as any;
      const newStatus = rejected ? "rejected" : "resolved";

      const { error } = await supabase
        .from("shift_incidents")
        .update({
          status: newStatus,
          resolved_by: moderator.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", incidentId);

      if (error) throw new Error(`Не удалось закрыть неявку: ${error.message}`);

      await logAction(supabase, moderator, "resolve_incident", {
        subjectId: incidentId,
        reason: reason ?? null,
        details: { status: newStatus },
      });
      return { success: true };
    }

    // ------------------------------------------------------------------
    // Журнал действий
    // ------------------------------------------------------------------
    if (action === "journal") {
      const { data: entries, error } = await supabase
        .from("moderation_actions")
        .select("id, action, reason, details, created_at, moderator_telegram_id, subject_telegram_id")
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (error) throw new Error(`Не удалось загрузить журнал: ${error.message}`);

      const names = await namesByTelegramId(
        supabase,
        (entries || []).flatMap((e: any) => [e.moderator_telegram_id, e.subject_telegram_id])
      );

      return {
        entries: (entries || []).map((e: any) => ({
          ...e,
          moderator_name: names.get(e.moderator_telegram_id) ?? null,
          subject_name: e.subject_telegram_id ? names.get(e.subject_telegram_id) ?? null : null,
        })),
      };
    }

    throw new Error(`Неизвестное действие: ${action}`);
  })
);
