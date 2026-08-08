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

/** Таблицы модерации ещё нет: миграцию не применили, а функции уже задеплоены. */
// deno-lint-ignore no-explicit-any
function isMissingTable(error: any): boolean {
  // 42P01 — undefined_table в Postgres, PGRST205 — «нет таблицы в схеме» у PostgREST.
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /does not exist|schema cache/i.test(error?.message ?? "")
  );
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

  if (error) {
    // Отсутствие таблицы не должно валить отклики, вакансии и смены у всех
    // пользователей: это ошибка выкладки, а не попытка обхода. Пропускаем
    // дальше, но пишем в лог, чтобы это не осталось незамеченным.
    if (isMissingTable(error)) {
      console.error(
        "[Moderation] Таблицы moderation_blocks нет — проверка блокировки пропущена. Примените миграцию 007_moderator.sql."
      );
      return { is_blocked: false, reason: null, unblock_at: null };
    }
    throw new Error(`Не удалось проверить блокировку: ${error.message}`);
  }

  const block = (data || [])[0];
  return {
    is_blocked: Boolean(block),
    reason: block?.reason ?? null,
    unblock_at: block?.expires_at ?? null,
  };
}

// ─── Назначение модераторов ──────────────────────────────────────────────────
//
// Назначать может любой модератор. Снять — не любого: нельзя разжаловать того,
// кто выше тебя по цепочке назначений. Иначе назначенный сразу снимает
// назначившего, и защита ничего не стоит.
//
// Цепочка транзитивна: если A назначил B, а B назначил C, то C не может снять
// ни B, ни A.

/** profiles.id всех, кто назначил этого модератора — прямо или через цепочку. */
// deno-lint-ignore no-explicit-any
export async function appointmentChain(supabase: any, profileId: string): Promise<Set<string>> {
  const chain = new Set<string>();
  let current: string | null = profileId;

  // Ограничение на глубину заодно защищает от зацикливания, если данные битые.
  for (let depth = 0; current && depth < 20; depth++) {
    const { data } = await supabase
      .from("moderator_grants")
      .select("granted_by")
      .eq("profile_id", current)
      .is("revoked_at", null)
      .maybeSingle();

    const grantedBy: string | undefined = data?.granted_by;
    if (!grantedBy || chain.has(grantedBy)) break;

    chain.add(grantedBy);
    current = grantedBy;
  }

  return chain;
}

/** Назначает модератором: меняет роль и запоминает, кто назначил. */
// deno-lint-ignore no-explicit-any
export async function grantModerator(supabase: any, moderator: Moderator, subjectId: string) {
  if (!subjectId) throw new Error("Не указан пользователь");

  const { data: subject } = await supabase
    .from("profiles")
    .select("id, telegram_id, role, first_name, last_name")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) throw new Error("Пользователь не найден");
  if (subject.role === "admin") throw new Error("Уже модератор");

  // Заблокированному права не выдаём: он даже войти не сможет.
  const blocked = await blockStatusFor(supabase, subject.telegram_id);
  if (blocked.is_blocked) throw new Error("Нельзя назначить заблокированного");

  const { error: grantError } = await supabase.from("moderator_grants").insert({
    profile_id: subject.id,
    telegram_id: subject.telegram_id,
    granted_by: moderator.id,
    previous_role: subject.role,
  });

  if (grantError) throw new Error(`Не удалось назначить: ${grantError.message}`);

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", subject.id);

  // Роль не сменилась — откатываем запись, иначе человек числится модератором,
  // но прав не имеет.
  if (roleError) {
    await supabase.from("moderator_grants").delete().eq("profile_id", subject.id).is("revoked_at", null);
    throw new Error(`Не удалось сменить роль: ${roleError.message}`);
  }

  await logAction(supabase, moderator, "grant_moderator", {
    subjectId: subject.id,
    subjectTelegramId: subject.telegram_id,
    details: { previous_role: subject.role },
  });

  return { granted: true, name: [subject.first_name, subject.last_name].filter(Boolean).join(" ") };
}

/** Снимает права модератора, если это разрешено правилами. */
// deno-lint-ignore no-explicit-any
export async function revokeModerator(supabase: any, moderator: Moderator, subjectId: string) {
  if (!subjectId) throw new Error("Не указан пользователь");
  if (subjectId === moderator.id) throw new Error("Нельзя снять права с себя");

  const { data: subject } = await supabase
    .from("profiles")
    .select("id, telegram_id, role, first_name")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) throw new Error("Пользователь не найден");
  if (subject.role !== "admin") throw new Error("Этот человек не модератор");

  // Главное правило: назначивший — и любой выше по цепочке — неприкосновенен.
  const chain = await appointmentChain(supabase, moderator.id);
  if (chain.has(subjectId)) {
    throw new Error("Нельзя снять того, кто назначил вас (403)");
  }

  const { data: grant } = await supabase
    .from("moderator_grants")
    .select("id, previous_role")
    .eq("profile_id", subjectId)
    .is("revoked_at", null)
    .maybeSingle();

  // Нет записи о назначении — модератор заведён напрямую в БД. Такого снимаем
  // тоже только через БД: иначе назначенный сможет разжаловать первого.
  if (!grant) {
    throw new Error("Этот модератор назначен через базу — снять можно только там (403)");
  }

  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count || 0) <= 1) throw new Error("Нельзя снять последнего модератора");

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: grant.previous_role })
    .eq("id", subjectId);

  if (roleError) throw new Error(`Не удалось вернуть прежнюю роль: ${roleError.message}`);

  await supabase
    .from("moderator_grants")
    .update({ revoked_at: new Date().toISOString(), revoked_by: moderator.id })
    .eq("id", grant.id);

  await logAction(supabase, moderator, "revoke_moderator", {
    subjectId,
    subjectTelegramId: subject.telegram_id,
    details: { restored_role: grant.previous_role },
  });

  return { revoked: true, restored_role: grant.previous_role };
}

/** Отказ по блокировке. Отдельный тип, чтобы функции вернули 403, а не 500 —
 *  так же, как это сделано для LimitError и RateLimitError. */
export class BlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedError";
  }
}

/**
 * Отклоняет любое действие заблокированного аккаунта.
 *
 * Проверки на входе в приложение недостаточно: initData у заблокированного
 * остаётся валидным, и он может дёрнуть функцию напрямую, минуя интерфейс.
 * Для того, кого блокируют за срыв смен, это существенно — поэтому запрет
 * стоит на сервере, в каждой функции действия.
 *
 */
// deno-lint-ignore no-explicit-any
export async function assertNotBlocked(supabase: any, telegramId: number): Promise<void> {
  const status = await blockStatusFor(supabase, telegramId);
  if (!status.is_blocked) return;

  const until = status.unblock_at
    ? `до ${new Date(status.unblock_at).toLocaleString("ru")}`
    : "бессрочно";
  throw new BlockedError(
    `Аккаунт заблокирован ${until}. Причина: ${status.reason || "не указана"}`
  );
}
