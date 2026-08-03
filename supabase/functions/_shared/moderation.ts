// Общая логика модерации: авторизация модератора, блокировки, предупреждения,
// жалобы и журнал действий. Используется moderation-service и точечными функциями
// (list-companies, block-company, warn-company, check-company-block).
//
// ВАЖНО: блокировка НЕ пишется в profiles.status / owner_profiles.status — их
// CHECK-констрейнты принадлежат общей платформе (см. 006_moderation.sql).
// Источник правды — таблица moderation_blocks.

export type SubjectType = "user" | "company";

/**
 * Готовит строку поиска для подстановки в PostgREST-фильтр `.or(...)`.
 * Запятая, скобки и точка там — синтаксис: без очистки ввод вида `a,b)` ломает
 * фильтр или подменяет условие. Оставляем только безопасные символы.
 */
export function sanitizeSearchTerm(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[,()*.\\%"']/g, " ")
    .trim()
    .slice(0, 100);
}

export interface ModeratorProfile {
  id: string;
  telegram_id: number;
  role: string;
  first_name: string;
}

export interface ActiveBlock {
  id: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

/**
 * Пускает дальше только администраторов. Роль читается из БД по проверенному
 * telegram_id (подпись initData уже проверена в handleEdgeFunction).
 */
export async function requireModerator(
  supabase: any,
  telegramId: number
): Promise<ModeratorProfile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, telegram_id, role, first_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    throw new Error(`Не удалось проверить права: ${error.message}`);
  }
  if (!profile) {
    throw new Error("Профиль не найден (403)");
  }
  if (profile.role !== "admin") {
    throw new Error("Доступ запрещён: требуется роль администратора (403)");
  }

  return profile as ModeratorProfile;
}

/** Активные блокировки по списку subject_id (не снятые и не истёкшие). */
export async function getActiveBlocks(
  supabase: any,
  subjectType: SubjectType,
  subjectIds: string[]
): Promise<Map<string, ActiveBlock>> {
  const result = new Map<string, ActiveBlock>();
  if (subjectIds.length === 0) return result;

  const { data, error } = await supabase
    .from("moderation_blocks")
    .select("id, subject_id, reason, expires_at, created_at")
    .eq("subject_type", subjectType)
    .in("subject_id", subjectIds)
    .is("lifted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Не удалось загрузить блокировки: ${error.message}`);
  }

  for (const row of data || []) {
    // Записи отсортированы по убыванию даты — оставляем самую свежую.
    if (!result.has(row.subject_id)) {
      result.set(row.subject_id, {
        id: row.id,
        reason: row.reason,
        expires_at: row.expires_at,
        created_at: row.created_at,
      });
    }
  }

  return result;
}

/** Количество записей в таблице по subject_id — для счётчиков в списках. */
async function countBy(
  supabase: any,
  table: string,
  idColumn: string,
  ids: string[],
  extraFilter?: (query: any) => any
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;

  let query = supabase.from(table).select(idColumn).in(idColumn, ids);
  if (extraFilter) query = extraFilter(query);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Не удалось посчитать ${table}: ${error.message}`);
  }

  for (const row of data || []) {
    const key = (row as Record<string, string>)[idColumn];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export async function getWarningCounts(
  supabase: any,
  subjectType: SubjectType,
  subjectIds: string[]
): Promise<Map<string, number>> {
  return countBy(supabase, "moderation_warnings", "subject_id", subjectIds, (q) =>
    q.eq("subject_type", subjectType)
  );
}

export async function getOpenComplaintCounts(
  supabase: any,
  subjectType: SubjectType,
  subjectIds: string[]
): Promise<Map<string, number>> {
  const table = subjectType === "company" ? "company_complaints" : "complaints";
  const idColumn = subjectType === "company" ? "reported_company_id" : "reported_user_id";
  return countBy(supabase, table, idColumn, subjectIds, (q) => q.eq("status", "open"));
}

/** Запись в журнал действий. Ошибка журналирования не ломает основную операцию. */
export async function logAction(
  supabase: any,
  moderator: ModeratorProfile,
  action: string,
  subjectType: SubjectType | null,
  subjectId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.from("moderation_actions").insert({
    moderator_id: moderator.id,
    moderator_telegram_id: moderator.telegram_id,
    action,
    subject_type: subjectType,
    subject_id: subjectId,
    details,
  });

  if (error) {
    console.error(`[Moderation] Не удалось записать действие ${action}:`, error.message);
  }
}

/**
 * Блокирует пользователя или компанию.
 * durationMinutes <= 0 или undefined => бессрочная блокировка.
 */
export async function blockSubject(
  supabase: any,
  moderator: ModeratorProfile,
  params: {
    subjectType: SubjectType;
    subjectId: string;
    subjectTelegramId?: number | null;
    reason: string;
    durationMinutes?: number;
  }
) {
  const { subjectType, subjectId, subjectTelegramId, reason, durationMinutes } = params;

  if (!subjectId) throw new Error("Не указан subject_id");
  if (!reason?.trim()) throw new Error("Не указана причина блокировки");

  const existing = await getActiveBlocks(supabase, subjectType, [subjectId]);
  if (existing.has(subjectId)) {
    throw new Error("Уже заблокирован");
  }

  const expiresAt =
    durationMinutes && durationMinutes > 0
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null;

  const { data: block, error } = await supabase
    .from("moderation_blocks")
    .insert({
      subject_type: subjectType,
      subject_id: subjectId,
      subject_telegram_id: subjectTelegramId ?? null,
      reason,
      expires_at: expiresAt,
      created_by: moderator.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Не удалось заблокировать: ${error.message}`);
  }

  await logAction(supabase, moderator, "block", subjectType, subjectId, {
    reason,
    expires_at: expiresAt,
  });

  return block;
}

/** Снимает все активные блокировки с субъекта. */
export async function unblockSubject(
  supabase: any,
  moderator: ModeratorProfile,
  subjectType: SubjectType,
  subjectId: string
) {
  if (!subjectId) throw new Error("Не указан subject_id");

  const { data: lifted, error } = await supabase
    .from("moderation_blocks")
    .update({ lifted_at: new Date().toISOString() })
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .is("lifted_at", null)
    .select();

  if (error) {
    throw new Error(`Не удалось разблокировать: ${error.message}`);
  }

  await logAction(supabase, moderator, "unblock", subjectType, subjectId, {
    lifted_count: lifted?.length || 0,
  });

  return { lifted_count: lifted?.length || 0 };
}

/**
 * Выдаёт предупреждение. После трёх предупреждений субъект блокируется
 * автоматически на 7 дней.
 */
export const AUTO_BLOCK_AFTER_WARNINGS = 3;

export async function warnSubject(
  supabase: any,
  moderator: ModeratorProfile,
  params: {
    subjectType: SubjectType;
    subjectId: string;
    subjectTelegramId?: number | null;
    reason: string;
    severity?: "mild" | "moderate" | "severe";
  }
) {
  const { subjectType, subjectId, subjectTelegramId, reason, severity = "mild" } = params;

  if (!subjectId) throw new Error("Не указан subject_id");
  if (!reason?.trim()) throw new Error("Не указана причина предупреждения");
  if (!["mild", "moderate", "severe"].includes(severity)) {
    throw new Error("Недопустимая severity: mild, moderate или severe");
  }

  const { data: warning, error } = await supabase
    .from("moderation_warnings")
    .insert({
      subject_type: subjectType,
      subject_id: subjectId,
      subject_telegram_id: subjectTelegramId ?? null,
      reason,
      severity,
      created_by: moderator.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Не удалось выдать предупреждение: ${error.message}`);
  }

  const counts = await getWarningCounts(supabase, subjectType, [subjectId]);
  const warningCount = counts.get(subjectId) || 1;

  await logAction(supabase, moderator, "warn", subjectType, subjectId, {
    reason,
    severity,
    warning_count: warningCount,
  });

  let autoBlocked = false;
  if (warningCount >= AUTO_BLOCK_AFTER_WARNINGS) {
    const active = await getActiveBlocks(supabase, subjectType, [subjectId]);
    if (!active.has(subjectId)) {
      await blockSubject(supabase, moderator, {
        subjectType,
        subjectId,
        subjectTelegramId,
        reason: `Автоблокировка после ${warningCount} предупреждений`,
        durationMinutes: 7 * 24 * 60,
      });
      autoBlocked = true;
    }
  }

  return { warning, warning_count: warningCount, auto_blocked: autoBlocked };
}

/** Статус блокировки одного субъекта — для проверки на входе в приложение. */
export async function checkBlockStatus(
  supabase: any,
  subjectType: SubjectType,
  subjectId: string
) {
  const blocks = await getActiveBlocks(supabase, subjectType, [subjectId]);
  const block = blocks.get(subjectId);

  return {
    is_blocked: Boolean(block),
    blocks: block
      ? [{ reason: block.reason, unblock_at: block.expires_at }]
      : [],
  };
}
