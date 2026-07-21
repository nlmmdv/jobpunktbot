import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { botMessages, openAppButton, esc, type RaterRole, type VacancyInfo } from "../_shared/bot-messages.ts";
import { clampText, TEXT_LIMITS } from "../_shared/limits.ts";

const ADMIN_CHAT_ID = -5402800630n;

// Вебхук Telegram: сюда прилетают апдейты от бота — /start, нажатия кнопок
// (callback_query) и текстовые ответы.
//
// В отличие от остальных функций, этот эндпоинт публичный по необходимости —
// его вызывает Telegram, а он не умеет предъявлять наши ключи. Поэтому в
// config.toml для него выключен verify_jwt, а единственная защита — секрет,
// который Telegram присылает заголовком X-Telegram-Bot-Api-Secret-Token
// (задаётся один раз при setWebhook). Без этой проверки кто угодно слал бы боту
// поддельные апдейты.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
const BOT_TOKEN = Deno.env.get("TELEGRAM_JOBBOT_TOKEN");

/** Telegram ретраит доставку на любой не-2xx и может отключить вебхук, поэтому
 *  на свои внутренние ошибки отвечаем 200 — они уходят в логи, а не в ретраи. */
const ok = () => new Response("ok", { status: 200 });

/** Пока не ответить на callback — у пользователя крутится часик на кнопке. */
async function answerCallback(callbackId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function sendMessage(telegramId: number, message: string, replyMarkup?: unknown) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ telegramId, message, parseMode: "HTML", replyMarkup }),
  });

  if (!response.ok) {
    throw new Error(`send-telegram-message failed: ${await response.text()}`);
  }
}

async function sendAdminMessage(text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: Number(ADMIN_CHAT_ID), text, parse_mode: "HTML" }),
  });
}

interface Match {
  id: string;
  vacancy_id: string;
  freelancer_telegram_id: number;
  owner_telegram_id: number;
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function fetchMatch(supabase: Db, matchId: string): Promise<Match | null> {
  const { data } = await supabase
    .from("job_matches")
    .select("id, vacancy_id, freelancer_telegram_id, owner_telegram_id")
    .eq("id", matchId)
    .maybeSingle();
  return data;
}

async function fetchVacancy(supabase: Db, vacancyId: string): Promise<VacancyInfo> {
  const { data } = await supabase
    .from("owner_vacancies")
    .select("address, payment, marketplaces, date, start_time, end_time")
    .eq("id", vacancyId)
    .maybeSingle();
  return data || {};
}

async function fetchName(supabase: Db, telegramId: number): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "Сотрудник";
}

/**
 * Вторую сторону смены вычисляем из самой записи, а не доверяем callback_data:
 * иначе, подменив его, можно было бы подтвердить чужую смену или поставить
 * оценку от чужого имени. Возвращает null, если нажавший — не участник.
 */
function counterpart(match: Match, actorId: number): number | null {
  if (actorId === match.freelancer_telegram_id) return match.owner_telegram_id;
  if (actorId === match.owner_telegram_id) return match.freelancer_telegram_id;
  return null;
}

async function saveRating(
  supabase: Db,
  params: { matchId: string; fromId: number; toId: number; rating: number; comment?: string }
) {
  // upsert, потому что сообщение с кнопками остаётся в чате навсегда и на них
  // могут нажать повторно — уникальный индекс (match_id, from_telegram_id).
  await supabase.from("ratings").upsert(
    {
      match_id: params.matchId,
      from_telegram_id: params.fromId,
      to_telegram_id: params.toId,
      rating: params.rating,
      comment: params.comment ?? null,
    },
    { onConflict: "match_id,from_telegram_id" }
  );
}

/* ── Обработчики ────────────────────────────────────────────────────────── */

async function handleShiftDecision(
  supabase: Db,
  actorId: number,
  matchId: string,
  confirmed: boolean
) {
  const match = await fetchMatch(supabase, matchId);

  // Выход подтверждает или отменяет только сам фрилансер этой смены.
  if (!match || match.freelancer_telegram_id !== actorId) {
    console.error(`Rejected shift decision: telegram_id=${actorId}, match=${matchId}`);
    return;
  }

  await supabase
    .from("job_matches")
    .update(confirmed ? { confirmed_at: new Date().toISOString() } : { status: "cancelled" })
    .eq("id", matchId);

  const [vacancy, name] = await Promise.all([
    fetchVacancy(supabase, match.vacancy_id),
    fetchName(supabase, actorId),
  ]);

  if (confirmed) {
    await sendMessage(match.owner_telegram_id, botMessages.shiftConfirmedToOwner(name, vacancy));
    await sendMessage(actorId, botMessages.shiftConfirmedToFreelancer());
  } else {
    await sendMessage(match.owner_telegram_id, botMessages.shiftCancelledToOwner(name, vacancy));
    await sendMessage(actorId, botMessages.shiftCancelledToFreelancer());
  }
}

async function handleRating(
  supabase: Db,
  actorId: number,
  matchId: string,
  rating: number,
  role: RaterRole
) {
  const match = await fetchMatch(supabase, matchId);
  const toId = match ? counterpart(match, actorId) : null;

  if (!match || toId === null) {
    console.error(`Rejected rating: telegram_id=${actorId}, match=${matchId}`);
    return;
  }

  // Низкая оценка без объяснения бесполезна — спрашиваем комментарий и ждём
  // следующее текстовое сообщение от этого пользователя.
  if (rating <= 3) {
    await supabase
      .from("pending_ratings")
      .upsert({ telegram_id: actorId, match_id: matchId, rating, role }, { onConflict: "telegram_id" });
    await sendMessage(actorId, botMessages.askComment());
    return;
  }

  await saveRating(supabase, { matchId, fromId: actorId, toId, rating });
  await sendMessage(actorId, botMessages.thanksRating());
}

/** Текст после низкой оценки — это комментарий к ней. */
async function handlePendingComment(supabase: Db, actorId: number, text: string): Promise<boolean> {
  const { data: pending } = await supabase
    .from("pending_ratings")
    .select("match_id, rating")
    .eq("telegram_id", actorId)
    .maybeSingle();

  if (!pending) return false;

  const match = await fetchMatch(supabase, pending.match_id);
  const toId = match ? counterpart(match, actorId) : null;

  if (match && toId !== null) {
    await saveRating(supabase, {
      matchId: pending.match_id,
      fromId: actorId,
      toId,
      rating: pending.rating,
      comment: clampText(text, TEXT_LIMITS.comment) as string,
    });
  }

  await supabase.from("pending_ratings").delete().eq("telegram_id", actorId);
  await sendMessage(actorId, botMessages.thanksFeedback());
  return true;
}

async function handleStart(supabase: Db, actorId: number, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("telegram_id", actorId)
    .maybeSingle();

  // Зарегистрированного встречаем по имени, новому объясняем, что это за бот.
  await sendMessage(
    chatId,
    profile?.first_name ? botMessages.startReturning(profile.first_name) : botMessages.start(),
    openAppButton()
  );
}

async function handleFeedbackStart(supabase: Db, actorId: number, chatId: number) {
  // Сохраняем состояние, что ждём обратную связь
  await supabase.from("bot_states").upsert(
    {
      telegram_id: actorId,
      state: "waiting_feedback",
      data: { initiated_at: new Date().toISOString() },
    },
    { onConflict: "telegram_id" }
  );

  await sendMessage(
    chatId,
    "Напишите ваш отзыв или вопрос. Мы обязательно прочитаем. 📝"
  );
}

async function handleFeedback(supabase: Db, actorId: number, chatId: number, text: string): Promise<boolean> {
  const { data: state } = await supabase
    .from("bot_states")
    .select("state")
    .eq("telegram_id", actorId)
    .maybeSingle();

  if (!state || state.state !== "waiting_feedback") {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, telegram_username")
    .eq("telegram_id", actorId)
    .maybeSingle();

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Пользователь";
  const userHandle = profile?.telegram_username ? `@${profile.telegram_username}` : `ID: ${actorId}`;
  const roleText = profile?.role === "owner" ? "Владелец" : "Фрилансер";

  const adminMessage = [
    "💬 <b>Обратная связь</b>",
    `От: ${esc(userName)} (${userHandle})`,
    `Роль: ${roleText}`,
    `ID: ${actorId}`,
    "",
    `Текст: ${esc(clampText(text, TEXT_LIMITS.comment) as string)}`,
  ].join("\n");

  await sendAdminMessage(adminMessage);

  // Удаляем состояние ожидания
  await supabase.from("bot_states").delete().eq("telegram_id", actorId);

  await sendMessage(chatId, "Спасибо! Мы получили ваше сообщение. 📬");
  return true;
}

/* ── Точка входа ────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WEBHOOK_SECRET) {
    // Без секрета проверить, что это действительно Telegram, нечем — молча
    // ничего не делаем, вместо того чтобы обрабатывать что попало.
    console.error("TELEGRAM_WEBHOOK_SECRET не установлен — апдейт пропущен");
    return ok();
  }

  if (req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    console.error("Rejected update: неверный secret token");
    return new Response("Forbidden", { status: 403 });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !BOT_TOKEN) {
      throw new Error("Server misconfigured: missing credentials");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const update = await req.json();

    /* Нажатие кнопки */
    const callback = update?.callback_query;
    if (callback) {
      const actorId: number | undefined = callback.from?.id;
      const data: string | undefined = callback.data;

      // Отвечаем сразу: иначе на кнопке висит индикатор загрузки.
      await answerCallback(callback.id);

      if (!actorId || !data) return ok();

      const [action, matchId, rating, role] = data.split(":");

      if (action === "confirm_shift" && matchId) {
        await handleShiftDecision(supabase, actorId, matchId, true);
      } else if (action === "cancel_shift" && matchId) {
        await handleShiftDecision(supabase, actorId, matchId, false);
      } else if (action === "rate" && matchId && rating) {
        await handleRating(
          supabase,
          actorId,
          matchId,
          Number(rating),
          role === "owner" ? "owner" : "freelancer"
        );
      }

      return ok();
    }

    /* Текстовое сообщение */
    const message = update?.message;
    const text: string | undefined = message?.text?.trim();
    const chatId: number | undefined = message?.chat?.id;
    const actorId: number | undefined = message?.from?.id;

    if (!chatId || !actorId || !text) return ok();

    // Явная команда важнее незакрытого комментария и обратной связи.
    if (text.startsWith("/start")) {
      await handleStart(supabase, actorId, chatId);
      return ok();
    }

    if (text.startsWith("/feedback")) {
      await handleFeedbackStart(supabase, actorId, chatId);
      return ok();
    }

    // Если ждём обратную связь, обрабатываем текст как отзыв
    if (await handleFeedback(supabase, actorId, chatId, text)) {
      return ok();
    }

    // Иначе это комментарий после низкой оценки
    await handlePendingComment(supabase, actorId, text);
  } catch (error) {
    console.error("Error handling Telegram update:", error);
  }

  return ok();
});
