/**
 * Форматирует телефон в формат +7 XXX XXX-XX-XX
 */
export const phoneMask = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits === '8') return '+7';

  const limited = digits.slice(0, 11);
  if (limited.startsWith('8')) {
    const rest = limited.slice(1);
    return '+7' + rest;
  }
  if (limited.startsWith('7')) {
    return '+' + limited;
  }
  return '+7' + limited;
};

/**
 * Проверяет валидность телефона (11 цифр)
 */
export const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
};

/**
 * Проверяет что строка не пустая
 */
export const isNotEmpty = (str: string): boolean => {
  return str.trim().length > 0;
};

/**
 * Форматирует дату в формат ДД.MM.ГГГГ
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ru-RU');
};

/**
 * Форматирует время в формат ЧЧ:MM
 */
export const formatTime = (hours: number, minutes: number): string => {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Получает инициалы из имени и фамилии
 */
export const getInitials = (firstName: string, lastName?: string): string => {
  const f = firstName.charAt(0).toUpperCase();
  const l = lastName?.charAt(0).toUpperCase() || '';
  return f + l;
};

/**
 * Преобразует строку в title case
 */
export const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Задерживает выполнение на N миллисекунд
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Ограничивает частоту вызовов функции (debounce)
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Ограничивает частоту вызовов функции (throttle)
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
