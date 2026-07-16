// Тексты бота. Основаны на текстах из ветки aleksey/telegram-bot-funnel и
// адаптированы под реальную схему: в owner_vacancies нет company_name / title /
// metro — есть address, payment, marketplaces, date, start_time, end_time.
// Тексты про рейтинг, статистику и фидбек не переносились: таких данных в схеме
// нет (profiles.rating не существует), а напоминания требуют планировщика.

export interface VacancyInfo {
  address?: string | null;
  payment?: number | null;
  marketplaces?: string[] | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export type Role = "employee" | "owner";

/** Прод-адрес мини-аппа. */
export const MINI_APP_URL = "https://jobpunktbot.vercel.app";

/**
 * Кнопка, открывающая мини-апп прямо из чата — она лучше, чем просить
 * пользователя куда-то пойти самому. Передаётся как replyMarkup в
 * send-telegram-message.
 */
export const openAppButton = (url: string = MINI_APP_URL) => ({
  inline_keyboard: [[{ text: "Открыть приложение", web_app: { url } }]],
});

/** «2026-07-20» → «20 июля». Часовой пояс фиксируем, чтобы дата не съезжала. */
const formatDate = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
};

const where = (v: VacancyInfo): string => `📍 ${v.address || "адрес не указан"}`;

/** Строка «когда» — только у временных смен, у постоянных даты нет. */
const when = (v: VacancyInfo): string =>
  v.date ? `\n📅 ${formatDate(v.date)}${v.start_time ? `, ${v.start_time} — ${v.end_time}` : ""}` : "";

const marketplaces = (v: VacancyInfo): string =>
  v.marketplaces?.length ? `\n📦 ${v.marketplaces.join(", ")}` : "";

const price = (v: VacancyInfo): string => `\n💰 ${v.payment ?? "—"} ₽`;

/** Полная карточка смены для сообщения. */
const vacancyCard = (v: VacancyInfo): string => `${where(v)}${when(v)}${marketplaces(v)}${price(v)}`;

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
    `С возвращением, ${firstName} 👋

Всё на месте — открывай приложение.
Я напишу, когда появятся новости по твоим откликам.`,

  /** Поздравление после регистрации. Тексты разные — роли видят разные экраны. */
  onboarding: (firstName: string, role: Role) =>
    role === "owner"
      ? `🎉 Готово, ${firstName}! Регистрация завершена.

Что теперь доступно:
📋 Мои вакансии — публикуй смены и постоянные вакансии
🔍 Поиск сотрудников — по городу, метро и маркетплейсу
📬 Отклики — принимай или отклоняй кандидатов

Я напишу сюда, как только кто-то откликнется на твою вакансию.`
      : `🎉 Готово, ${firstName}! Регистрация завершена.

Что теперь доступно:
📋 Подработка — отмечай дни, когда готов выйти
💼 Вакансии — постоянная работа на ПВЗ
⏰ Замены — разовые смены рядом с домом
📬 Отклики — статусы твоих заявок

Я напишу сюда, когда на твой отклик ответят или тебе предложат смену.`,

  /** Владельцу: фрилансер откликнулся на его вакансию. */
  newApplication: (ownerFirstName: string, applicantName: string, v: VacancyInfo) =>
    `📋 Новый отклик, ${ownerFirstName}!

${applicantName} откликнулся на твою вакансию:
${vacancyCard(v)}

Посмотреть и ответить — в приложении.`,

  /** Фрилансеру: владелец предложил ему смену. */
  newOffer: (firstName: string, v: VacancyInfo) =>
    `📬 Тебе предложили смену, ${firstName}!

${vacancyCard(v)}

Принять или отклонить — в приложении.`,

  /** Фрилансеру: владелец принял его отклик. */
  matchAccepted: (firstName: string, v: VacancyInfo, contactUsername?: string | null) =>
    `✅ Отлично, ${firstName}!

Твой отклик принят:
${vacancyCard(v)}
${contactUsername ? `\nСвязаться: @${contactUsername.replace("@", "")}` : "\nКонтакт появится в приложении."}`,

  /** Фрилансеру: отклик отклонён. */
  matchRejected: (firstName: string, v: VacancyInfo) =>
    `😔 Жаль, ${firstName}

Твой отклик на смену по адресу «${v.address || "без адреса"}» не прошёл.
Но не расстраивайся — есть другие предложения, загляни в приложение.`,
};
