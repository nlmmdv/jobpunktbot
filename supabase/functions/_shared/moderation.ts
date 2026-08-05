// Общая логика модерации: проверка прав, блокировки, журнал.
//
// Роль модератора в БД — 'admin' (единственное значение, разрешённое
// констрейнтом profiles.role). В интерфейсе она называется «Модератор».
//
// Блокировка живёт в moderation_blocks, а не в profiles.status: тот констрейнт
// принадлежит общей платформе, и флаг в нём не умеет ни срока, ни снятия.

export interface Moderator {
  id: string;
  telegram_id: number;
  first_name: string;
}

export interface ActiveBlock {
  id: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

/**
 * Готовит строку поиска для PostgREST-фильтра `.or(...)`. Запятая, скобки и
 * точка там — синтаксис: без очистки ввод вида `a,b)` ломает фильтр или
 * подменяет условие.
 */
export function sanitizeSearch(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[,()*.\\%"']/g, " ")
    .trim()
    .slice(0, 100);
}

/** Пускает дальше только модератора. Роль читается из БД по проверенному telegram_id. */
// deno-lint-ignore no-explicit-any
export async function requireModerator(supabase: any, telegramId: number): Promise<Moderator> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, telegram_id, role, first_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw new Error(`Не удалось проверить права: ${error.message}`);
  if (!profile) throw new Error("Профиль не найден (403)");
  if (profile.role !== "admin") throw new Error("Доступ запрещён: нужны права модератора (403)");

  return profile as Moderator;
}

/** Запись в журнал. Сбой журналирования не должен ломать основную операцию. */
// deno-lint-ignore no-explicit-any
export async function logAction(
  supabase: any,
  moderator: Moderator,
  action: string,
  params: {
    subjectId?: string | null;
    subjectTelegramId?: number | null;
    reason?: string | null;
    details?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const { error } = await supabase.from("moderation_actions").insert({
    moderator_id: moderator.id,
    moderator_telegram_id: moderator.telegram_id,
    action,
    subject_id: params.subjectId ?? null,
    subject_telegram_id: params.subjectTelegramId ?? null,
    reason: params.reason ?? null,
    details: params.details ?? {},
  });

  if (error) console.error(`[Moderation] Не записалось действие ${action}:`, error.message);
}

/** Действующие блокировки: не снятые вручную и не истёкшие по сроку. */
// deno-lint-ignore no-explicit-any
export async function activeBlocks(supabase: any, subjectIds: string[]) {
  const result = new Map<string, ActiveBlock>();
  if (subjectIds.length === 0) return result;

  const { data, error } = await supabase
    .from("moderation_blocks")
    .select("id, subject_id, reason, expires_at, created_at")
    .in("subject_id", subjectIds)
    .is("lifted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Не удалось загрузить блокировки: ${error.message}`);

  // Отсортировано по убыванию даты — оставляем самую свежую на субъект.
  for (const row of data || []) {
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

/**
 * Блокирует аккаунт — владельца или фрилансера, механика одна.
 * durationMinutes <= 0 или не задан => бессрочно.
 */
// deno-lint-ignore no-explicit-any
export async function blockAccount(
  supabase: any,
  moderator: Moderator,
  params: { subjectId: string; reason: string; durationMinutes?: number }
) {
  const { subjectId, reason, durationMinutes } = params;

  if (!subjectId) throw new Error("Не указан пользователь");
  if (!reason?.trim()) throw new Error("Не указана причина блокировки");

  const { data: subject } = await supabase
    .from("profiles")
    .select("id, telegram_id, role, first_name")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) throw new Error("Пользователь не найден");
  if (subject.role === "admin") throw new Error("Нельзя заблокировать модератора");

  const existing = await activeBlocks(supabase, [subjectId]);
  if (existing.has(subjectId)) throw new Error("Аккаунт уже заблокирован");

  const expiresAt =
    durationMinutes && durationMinutes > 0
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null;

  const { data: block, error } = await supabase
    .from("moderation_blocks")
    .insert({
      subject_id: subject.id,
      subject_telegram_id: subject.telegram_id,
      subject_role: subject.role,
      reason: reason.trim(),
      expires_at: expiresAt,
      created_by: moderator.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Не удалось заблокировать: ${error.message}`);

  await logAction(supabase, moderator, "block", {
    subjectId: subject.id,
    subjectTelegramId: subject.telegram_id,
    reason: reason.trim(),
    details: { expires_at: expiresAt, role: subject.role },
  });

  return { block, subject_name: subject.first_name };
}

/** Снимает все действующие блокировки с аккаунта. */
// deno-lint-ignore no-explicit-any
export async function unblockAccount(supabase: any, moderator: Moderator, subjectId: string) {
  if (!subjectId) throw new Error("Не указан пользователь");

  const { data: lifted, error } = await supabase
    .from("moderation_blocks")
    .update({ lifted_at: new Date().toISOString(), lifted_by: moderator.id })
    .eq("subject_id", subjectId)
    .is("lifted_at", null)
    .select();

  if (error) throw new Error(`Не удалось разблокировать: ${error.message}`);

  await logAction(supabase, moderator, "unblock", {
    subjectId,
    details: { lifted_count: lifted?.length || 0 },
  });

  return { lifted_count: lifted?.length || 0 };
}

/** Статус блокировки одного аккаунта — для проверки на входе в приложение. */
// deno-lint-ignore no-explicit-any
export async function blockStatusFor(supabase: any, telegramId: number) {
  const { data, error } = await supabase
    .from("moderation_blocks")
    .select("reason, expires_at")
    .eq("subject_telegram_id", telegramId)
    .is("lifted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(`Не удалось проверить блокировку: ${error.message}`);

  const block = (data || [])[0];
  return {
    is_blocked: Boolean(block),
    reason: block?.reason ?? null,
    unblock_at: block?.expires_at ?? null,
  };
}
