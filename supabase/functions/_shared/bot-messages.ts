// Тексты бота. Основаны на текстах из ветки aleksey/telegram-bot-funnel и
// адаптированы под реальную схему: в owner_vacancies нет company_name / title /
// metro — есть address, payment, marketplaces, date, start_time, end_time.
//
// Все сообщения уходят с parse_mode: HTML, поэтому КАЖДОЕ подставляемое значение
// от пользователя (адрес, имя) обязано проходить через esc(). Без этого адрес
// вроде «Тверская, д.1 & 3» уронит отправку, а <a href> в адресе дошёл бы
// получателю живой ссылкой от имени бота.

export interface VacancyInfo {
  address?: string | null;
  payment?: number | null;
  marketplaces?: string[] | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export type Role = "employee" | "owner";
export type RaterRole = "freelancer" | "owner";

/** Прод-адрес мини-аппа. */
export const MINI_APP_URL = "https://jobpunktbot.vercel.app";

/** Экранирование для parse_mode: HTML. */
export const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** «2026-07-20» → «20 июля». Часовой пояс фиксируем, чтобы дата не съезжала. */
const formatDate = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
};

/** «09:00:00» → «09:00». */
const formatTime = (t?: string | null): string => (t ? t.slice(0, 5) : "");

const where = (v: VacancyInfo) => `📍 ${esc(v.address || "адрес не указан")}`;
const when = (v: VacancyInfo) =>
  v.date
    ? `\n📅 ${formatDate(v.date)}${v.start_time ? `, ${formatTime(v.start_time)} — ${formatTime(v.end_time)}` : ""}`
    : "";
const marketplaces = (v: VacancyInfo) =>
  v.marketplaces?.length ? `\n📦 ${esc(v.marketplaces.join(", "))}` : "";
const price = (v: VacancyInfo) => `\n💰 ${esc(v.payment ?? "—")} ₽`;

/** Единая карточка смены — одно место, где выполняется экранирование. */
const vacancyCard = (v: VacancyInfo) => `${where(v)}${when(v)}${marketplaces(v)}${price(v)}`;

/* ── Кнопки ─────────────────────────────────────────────────────────────── */

/** Открывает мини-апп прямо из чата. */
export const openAppButton = (url: string = MINI_APP_URL) => ({
  inline_keyboard: [[{ text: "Открыть приложение", web_app: { url } }]],
});

export const confirmShiftKeyboard = (matchId: string) => ({
  inline_keyboard: [[
    { text: "✅ Подтверждаю выход", callback_data: `confirm_shift:${matchId}` },
    { text: "❌ Не смогу", callback_data: `cancel_shift:${matchId}` },
  ]],
});

export const rateKeyboard = (matchId: string, role: RaterRole) => ({
  inline_keyboard: [
    [1, 2, 3, 4, 5].map((n) => ({
      text: `⭐${n}`,
      callback_data: `rate:${matchId}:${n}:${role}`,
    })),
  ],
});

/* ── Сообщения ──────────────────────────────────────────────────────────── */

export const botMessages = {
  /**
   * Ответ на /start для незарегистрированного. Кто перед нами — сотрудник или
   * владелец ПВЗ — на этом шаге неизвестно, поэтому говорим с обоими сразу.
   */
  start: () =>
    `👋 Это ПроПункт — биржа труда для пунктов выдачи.

Ищешь работу — найдёшь смены и постоянные вакансии рядом с домом и откликнешься в один тап.
Владеешь ПВЗ — разместишь вакансию и найдёшь сотрудников.

Я буду писать сюда, когда на отклик ответят.`,

  /** Ответ на /start тому, кто уже зарегистрирован — имя и роль мы уже знаем. */
  startReturning: (firstName: string) =>
    `С возвращением, ${esc(firstName)} 👋

Всё на месте — открывай приложение.
Я напишу, когда появятся новости по твоим откликам.`,

  /** Поздравление после регистрации. Тексты разные — роли видят разные экраны. */
  onboarding: (firstName: string, role: Role) =>
    role === "owner"
      ? `🎉 Готово, ${esc(firstName)}! Регистрация завершена.

Что теперь доступно:
📋 Мои вакансии — публикуй смены и постоянные вакансии
🔍 Поиск сотрудников — по городу, метро и маркетплейсу
📬 Отклики — принимай или отклоняй кандидатов

Я напишу сюда, как только кто-то откликнется на твою вакансию.`
      : `🎉 Готово, ${esc(firstName)}! Регистрация завершена.

Что теперь доступно:
📋 Подработка — отмечай дни, когда готов выйти
💼 Вакансии — постоянная работа на ПВЗ
⏰ Замены — разовые смены рядом с домом
📬 Отклики — статусы твоих заявок

Я напишу сюда, когда на твой отклик ответят или тебе предложат смену.`,

  /** Владельцу: фрилансер откликнулся на его вакансию. */
  newApplication: (ownerFirstName: string, applicantName: string, v: VacancyInfo) =>
    `📋 Новый отклик, ${esc(ownerFirstName)}!

${esc(applicantName)} откликнулся на твою вакансию:
${vacancyCard(v)}

Посмотреть и ответить — в приложении.`,

  /** Фрилансеру: владелец предложил ему смену. */
  newOffer: (firstName: string, v: VacancyInfo) =>
    `📬 Тебе предложили смену, ${esc(firstName)}!

${vacancyCard(v)}

Принять или отклонить — в приложении.`,

  /** Фрилансеру: владелец принял его отклик. */
  matchAccepted: (firstName: string, v: VacancyInfo, contactUsername?: string | null) =>
    `✅ Отлично, ${esc(firstName)}!

Твой отклик принят:
${vacancyCard(v)}
${contactUsername ? `\nСвязаться: @${esc(contactUsername.replace("@", ""))}` : "\nКонтакт появится в приложении."}`,

  /** Фрилансеру: отклик отклонён. */
  matchRejected: (firstName: string, v: VacancyInfo) =>
    `😔 Жаль, ${esc(firstName)}

Твой отклик на смену по адресу «${esc(v.address || "без адреса")}» не прошёл.
Но не расстраивайся — есть другие предложения, загляни в приложение.`,

  /* ── Смена: напоминание и подтверждение ─────────────────────────────── */

  /** Фрилансеру за час до начала. */
  shiftReminder: (v: VacancyInfo) =>
    `📋 <b>Напоминание о смене</b>

${where(v)}
📅 Сегодня, ${formatTime(v.start_time)} — ${formatTime(v.end_time)}${marketplaces(v)}${price(v)}

Подтверди, что выйдешь на смену:`,

  shiftConfirmedToFreelancer: () => `Отлично! Ты подтвердил выход на смену.`,

  shiftConfirmedToOwner: (freelancerName: string, v: VacancyInfo) =>
    `✅ ${esc(freelancerName)} подтвердил смену${when(v)}
${where(v)}`,

  shiftCancelledToFreelancer: () => `Смена отменена. Пожалуйста, предупреждай заранее.`,

  shiftCancelledToOwner: (freelancerName: string, v: VacancyInfo) =>
    `❌ ${esc(freelancerName)} не сможет выйти на смену${when(v)}
${where(v)}

Ищи замену!`,

  /* ── Оценки ──────────────────────────────────────────────────────────── */

  rateOwnerRequest: (v: VacancyInfo) =>
    `⭐ <b>Оцени работодателя</b>

${where(v)}${when(v)}

Как прошла смена?`,

  rateFreelancerRequest: (freelancerName: string, v: VacancyInfo) =>
    `⭐ <b>Оцени сотрудника</b>

${esc(freelancerName)}
${where(v)}${when(v)}

Как прошла смена?`,

  askComment: () => `Расскажи, что пошло не так:`,

  thanksRating: () => `Спасибо за оценку!`,

  thanksFeedback: () => `Спасибо за отзыв!`,
};
