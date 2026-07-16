export const CITIES_LIST = ['Москва', 'Санкт-Петербург', 'Другое'];

export const TELEGRAM_BOT_MESSAGES = {
  onboarding: {
    welcome: (firstName: string) => `👋 Привет, ${firstName}! Я ПроПункт Бот 🤖

Я буду помогать тебе:
✓ Находить подходящие смены
✓ Отслеживать статус твоих заявок
✓ Уведомлять о новых возможностях

Начнём с того, что создашь свой профиль в приложении?`,

    helpFirstApplication: () => `👀 Вижу, что ты в приложении, но заявку ещё не создал!

Не знаешь как? Вот пошагово:
1️⃣ Заходишь в "Доступные смены"
2️⃣ Выбираешь понравившуюся
3️⃣ Нажимаешь "Откликнуться"
4️⃣ Готово! 🎉

Если что-то не понятно, напиши мне /help`,
  },

  applications: {
    approved: (firstName: string, companyName: string, metro: string, startTime: string, endTime: string, payment: number) =>
      `✅ Отлично, ${firstName}!

Твоя заявка принята:
🏢 ${companyName}
📍 ${metro}
⏰ ${startTime} — ${endTime}
💰 ${payment} ₽/день

Контакт работодателя скоро свяжется с тобой.
Не забудь дать обратную связь после смены!`,

    rejected: (firstName: string, companyName: string) =>
      `😔 Жаль, ${firstName}

К сожалению, твоя заявка на смену в ${companyName} не прошла.
Но не расстраивайся! Есть много других интересных предложений.

[Смотреть другие смены]`,

    multiple: (firstName: string, count: number) =>
      `📋 У тебя новые отклики!

На твои заявки откликнулось ${count} человек.
Срочно закрой вакансию и выбери лучшего!

[Выбрать кандидата]`,
  },

  ratings: {
    ratingIncreased: (firstName: string, newRating: number, previousRating: number, reason: string) =>
      `🌟 Поздравляем, ${firstName}!

Твой рейтинг вырос: ${newRating.toFixed(1)} ⭐ (было ${previousRating.toFixed(1)})
${reason}

Так держать! 💪
Работодатели охотнее приглашают сотрудников с высоким рейтингом.`,

    ratingDecreased: (firstName: string, newRating: number, reason: string) =>
      `⚠️ ${firstName}, твой рейтинг снизился до ${newRating.toFixed(1)} ⭐

Причина: ${reason}

Постарайся улучшить качество работы на следующих смёнах!
Если есть проблемы, напиши в /help`,
  },

  reminders: {
    shiftReminder: (firstName: string, companyName: string, metro: string, startTime: string, endTime: string) =>
      `⏰ Напоминание, ${firstName}!

Через 2 часа твоя смена:
🏢 ${companyName}
📍 ${metro}
⏰ ${startTime} — ${endTime}

Убедись что ты в курсе контактов и адреса!
[Посмотреть детали]`,

    inactivityReminder: (firstName: string, daysSinceActive: number) =>
      `😴 Давно не видим тебя, ${firstName}!

За последние ${daysSinceActive} дней ты не создавал заявок.
Может быть что-то не получается?

📞 /help — помощь
💬 Напиши свой вопрос

Ждём тебя обратно! 💙`,
  },

  feedback: {
    postShiftFeedback: (firstName: string) =>
      `😊 Как прошла смена, ${firstName}?

Помоги нам улучшить сервис:
⭐⭐⭐⭐⭐ Отлично!
⭐⭐⭐⭐ Хорошо
⭐⭐⭐ Нормально
⭐⭐ Плохо
⭐ Очень плохо

Спасибо за обратную связь! 💙`,
  },

  statistics: {
    weeklyStats: (firstName: string, shiftsCompleted: number, totalEarned: number, avgRating: number) =>
      `📊 Твоя статистика за неделю, ${firstName}!

✅ Выполнено смен: ${shiftsCompleted}
💰 Заработано: ${totalEarned.toLocaleString('ru-RU')} ₽
⭐ Средний рейтинг: ${avgRating.toFixed(1)}
📈 Статус: ${avgRating >= 4.5 ? 'Топ 10% сотрудников!' : 'Хороший прогресс!'}

[Смотреть доступные смены]`,

    monthlyStats: (firstName: string, shiftsCompleted: number, totalEarned: number, rankPercentile: number) =>
      `📈 Итоги месяца, ${firstName}!

✅ Всего смен: ${shiftsCompleted}
💰 Заработано: ${totalEarned.toLocaleString('ru-RU')} ₽
🏆 Ты в топ-${rankPercentile}% всех сотрудников

Отличная работа! Продолжай в том же духе! 🚀`,
  },

  ownerMessages: {
    newApplicants: (companyName: string, vacancyTitle: string, count: number) =>
      `📋 У тебя новые отклики!

На вакансию "${vacancyTitle}" в ${companyName} откликнулось ${count} человек.

⭐ Рекомендуем лучших кандидатов:
[Выбрать кандидата]`,

    shiftCompleted: (companyName: string, employeeName: string, shiftsCount: number) =>
      `✅ Смена завершена!

Сотрудник: ${employeeName}
Компания: ${companyName}
${shiftsCount > 1 ? `Это смена #${shiftsCount} для этого сотрудника` : 'Первая смена!'}

[Оставить отзыв]`,
  },

  commandHelp: () => `📖 Помощь ПроПункт Бота

/start — Главное меню
/help — Эта справка
/app — Открыть приложение
/support — Связь с поддержкой

❓ Частые вопросы:

**Как создать заявку?**
Открой приложение → "Доступные смены" → Выбери смену → "Откликнуться"

**Почему мою заявку отклонили?**
Работодатель мог выбрать кого-то другого. Не расстраивайся, есть ещё много предложений!

**Как поднять рейтинг?**
Выполняй смены качественно и вовремя. Работодатели будут ставить тебе высокие оценки!

**Есть проблема?**
Напиши в /support`,
};
