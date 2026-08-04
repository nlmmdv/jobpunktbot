// Лимиты приложения: длина текстов и количество активных объектов.
// Держим в одном месте, чтобы фронт и бэкенд не разъезжались.

export const TEXT_LIMITS = {
  /** «О себе» в резюме */
  about: 500,
  /** Описание вакансии */
  description: 1000,
  /** Комментарий к оценке */
  comment: 300,
} as const;

export const COUNT_LIMITS = {
  /** Активных вакансий у владельца */
  ownerVacancies: 20,
  /** Активных (pending) откликов у фрилансера */
  freelancerPendingMatches: 10,
  /** Предложений владельца в сутки */
  ownerOffersPerDay: 10,
} as const;

/**
 * Обрезает текст до максимума. Именно обрезаем, а не отклоняем: фронт уже
 * ограничивает ввод через maxLength, так что сюда длинный текст доедет только
 * в обход интерфейса — ронять из-за этого сохранение незачем.
 */
export function clampText<T>(value: T, max: number): T | string {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Ошибка бизнес-лимита — её текст показывается пользователю как есть. */
export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}
