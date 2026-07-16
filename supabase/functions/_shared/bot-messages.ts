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
  /** Ответ на /start — человек ещё может быть не зарегистрирован. */
  start: () =>
    `👋 Привет! Я ПроПункт Бот 🤖

Помогаю найти работу и сотрудников на ПВЗ:
✓ Смены и постоянные вакансии рядом с домом
✓ Отклики в один тап
✓ Уведомления, когда на твой отклик ответят

Открывай приложение и регистрируйся — это займёт минуту.`,

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
