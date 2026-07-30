import { callFunction } from './api';
import type { BotEventPayload } from './telegram-types';

/**
 * Триггер события для отправки сообщения в Telegram бот
 */
export async function triggerBotEvent(event: BotEventPayload): Promise<void> {
  try {
    await callFunction('handle-bot-events', { ...event });
    console.log('✅ Bot event triggered:', event.type);
  } catch (error) {
    console.error('❌ Failed to trigger bot event:', error);
    // Не бросаем ошибку, чтобы приложение не ломалось если бот недоступен
  }
}

/**
 * Отправить события при регистрации новых пользователей
 */
export async function notifyUserOnboarding(telegramId: number): Promise<void> {
  await triggerBotEvent({
    type: 'onboarding',
    data: { telegram_id: telegramId },
  });
}

/**
 * Уведомить пользователя о принятой заявке
 */
export async function notifyApplicationApproved(
  telegramId: number,
  companyName: string,
  metro: string,
  startTime: string,
  endTime: string,
  payment: number,
): Promise<void> {
  await triggerBotEvent({
    type: 'application_approved',
    data: {
      telegram_id: telegramId,
      company_name: companyName,
      metro,
      start_time: startTime,
      end_time: endTime,
      payment,
    },
  });
}

/**
 * Уведомить пользователя об отклоненной заявке
 */
export async function notifyApplicationRejected(
  telegramId: number,
  companyName: string,
): Promise<void> {
  await triggerBotEvent({
    type: 'application_rejected',
    data: {
      telegram_id: telegramId,
      company_name: companyName,
    },
  });
}

/**
 * Уведомить пользователя об изменении рейтинга
 */
export async function notifyRatingChanged(
  telegramId: number,
  newRating: number,
  previousRating: number,
  reason: string,
): Promise<void> {
  await triggerBotEvent({
    type: 'rating_changed',
    data: {
      telegram_id: telegramId,
      new_rating: newRating,
      previous_rating: previousRating,
      reason,
    },
  });
}

/**
 * Напомнить пользователю о предстоящей смене (вызывается из бэкенда)
 */
export async function notifyShiftReminder(
  telegramId: number,
  companyName: string,
  metro: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  await triggerBotEvent({
    type: 'shift_reminder',
    data: {
      telegram_id: telegramId,
      company_name: companyName,
      metro,
      start_time: startTime,
      end_time: endTime,
    },
  });
}

/**
 * Уведомить владельца ПВЗ о новых откликах на вакансию
 */
export async function notifyNewApplicants(
  telegramId: number,
  vacancyTitle: string,
  count: number,
): Promise<void> {
  await triggerBotEvent({
    type: 'new_applicants',
    data: {
      telegram_id: telegramId,
      vacancy_title: vacancyTitle,
      count,
    },
  });
}
