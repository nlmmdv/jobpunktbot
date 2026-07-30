/**
 * Mock версия bot-utils для тестирования без реального бота
 * Логирует сообщения в консоль вместо отправки через Telegram
 */

import type { BotEventPayload } from './telegram-types';

// Хранилище для тестирования
export const mockMessageLog: Array<{
  timestamp: string;
  type: string;
  telegramId: number;
  message: string;
}> = [];

function logMessage(type: string, telegramId: number, message: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    telegramId,
    message,
  };

  mockMessageLog.push(logEntry);

  console.group(`📨 Bot Message: ${type}`);
  console.log(`👤 Telegram ID: ${telegramId}`);
  console.log(`📝 Message:\n${message}`);
  console.log(`⏰ Time: ${logEntry.timestamp}`);
  console.groupEnd();
}

export async function triggerBotEvent(event: BotEventPayload): Promise<void> {
  console.log('🔔 Bot Event:', event.type);
  console.log('📊 Data:', event.data);
}

export async function notifyUserOnboarding(telegramId: number): Promise<void> {
  logMessage(
    'onboarding',
    telegramId,
    `👋 Привет! Я ПроПункт Бот 🤖

Я буду помогать тебе:
✓ Находить подходящие смены
✓ Отслеживать статус твоих заявок
✓ Уведомлять о новых возможностях

Начнём с того, что создашь свой профиль в приложении?`
  );
}

export async function notifyApplicationApproved(
  telegramId: number,
  companyName: string,
  metro: string,
  startTime: string,
  endTime: string,
  payment: number,
): Promise<void> {
  logMessage(
    'application_approved',
    telegramId,
    `✅ Отлично!

Твоя заявка принята:
🏢 ${companyName}
📍 ${metro}
⏰ ${startTime} — ${endTime}
💰 ${payment} ₽/день

Контакт работодателя скоро свяжется с тобой.
Не забудь дать обратную связь после смены!`
  );
}

export async function notifyApplicationRejected(
  telegramId: number,
  companyName: string,
): Promise<void> {
  logMessage(
    'application_rejected',
    telegramId,
    `😔 Жаль

К сожалению, твоя заявка на смену в ${companyName} не прошла.
Но не расстраивайся! Есть много других интересных предложений.`
  );
}

export async function notifyRatingChanged(
  telegramId: number,
  newRating: number,
  previousRating: number,
  reason: string,
): Promise<void> {
  const isIncrease = newRating > previousRating;

  logMessage(
    'rating_changed',
    telegramId,
    isIncrease
      ? `🌟 Поздравляем!

Твой рейтинг вырос: ${newRating.toFixed(1)} ⭐
(было ${previousRating.toFixed(1)})

${reason}

Так держать! 💪
Работодатели охотнее приглашают сотрудников с высоким рейтингом.`
      : `⚠️ Твой рейтинг снизился до ${newRating.toFixed(1)} ⭐

Причина: ${reason}

Постарайся улучшить качество работы на следующих смёнах!`
  );
}

export async function notifyShiftReminder(
  telegramId: number,
  companyName: string,
  metro: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  logMessage(
    'shift_reminder',
    telegramId,
    `⏰ Напоминание!

Через 2 часа твоя смена:
🏢 ${companyName}
📍 ${metro}
⏰ ${startTime} — ${endTime}

Убедись что ты в курсе контактов и адреса!`
  );
}

export async function notifyNewApplicants(
  telegramId: number,
  vacancyTitle: string,
  count: number,
): Promise<void> {
  logMessage(
    'new_applicants',
    telegramId,
    `📋 У тебя новые отклики!

На вакансию "${vacancyTitle}" откликнулось ${count} человек.

Срочно закрой вакансию и выбери лучшего!`
  );
}

/**
 * Получить все логированные сообщения
 */
export function getMessageLog() {
  return mockMessageLog;
}

/**
 * Очистить лог
 */
export function clearMessageLog() {
  mockMessageLog.length = 0;
  console.log('🧹 Message log cleared');
}

/**
 * Вывести статистику логов
 */
export function printMessageStats() {
  const stats = {
    total: mockMessageLog.length,
    byType: {} as Record<string, number>,
  };

  mockMessageLog.forEach((msg) => {
    stats.byType[msg.type] = (stats.byType[msg.type] || 0) + 1;
  });

  console.table(stats);
}
