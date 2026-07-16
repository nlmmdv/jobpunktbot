// Тексты бота. Взяты из ветки aleksey/telegram-bot-funnel и адаптированы под
// реальную схему: в owner_vacancies нет company_name / title / metro — есть
// address, payment, date, start_time, end_time. Тексты про рейтинг, статистику,
// напоминания и фидбек не переносились: таких данных в схеме нет
// (profiles.rating не существует), а напоминания требуют планировщика.

export interface VacancyInfo {
  address?: string | null;
  payment?: number | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

/** Строка «когда» — только для временных смен, у постоянных даты нет. */
const when = (v: VacancyInfo): string =>
  v.date ? `\n📅 ${v.date}${v.start_time ? `, ${v.start_time} — ${v.end_time}` : ''}` : '';

const where = (v: VacancyInfo): string => `📍 ${v.address || 'адрес не указан'}`;

const price = (v: VacancyInfo): string => `💰 ${v.payment ?? '—'} ₽`;

export const botMessages = {
  onboarding: (firstName: string) =>
    `👋 Привет, ${firstName}! Я ПроПункт Бот 🤖

Я буду помогать тебе:
✓ Находить подходящие смены
✓ Отслеживать статус твоих заявок
✓ Уведомлять о новых возможностях

Открывай приложение и создавай профиль — начнём!`,

  /** Фрилансеру: владелец принял его отклик. */
  matchAccepted: (firstName: string, v: VacancyInfo, contactUsername?: string | null) =>
    `✅ Отлично, ${firstName}!

Твой отклик принят:
${where(v)}${when(v)}
${price(v)}
${contactUsername ? `\nСвязаться: @${contactUsername.replace('@', '')}` : '\nКонтакт появится в приложении.'}`,

  /** Фрилансеру: отклик отклонён. */
  matchRejected: (firstName: string, v: VacancyInfo) =>
    `😔 Жаль, ${firstName}

Твой отклик на смену по адресу «${v.address || 'без адреса'}» не прошёл.
Но не расстраивайся — есть другие предложения, загляни в приложение.`,

  /** Владельцу: фрилансер откликнулся на его вакансию. */
  newApplication: (ownerFirstName: string, applicantName: string, v: VacancyInfo) =>
    `📋 Новый отклик, ${ownerFirstName}!

${applicantName} откликнулся на твою вакансию:
${where(v)}
${price(v)}

Посмотреть и ответить — в приложении.`,

  /** Фрилансеру: владелец предложил ему смену. */
  newOffer: (firstName: string, v: VacancyInfo) =>
    `📬 Тебе предложили смену, ${firstName}!

${where(v)}${when(v)}
${price(v)}

Принять или отклонить — в приложении.`,
};
