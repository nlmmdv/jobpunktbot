import { SUPABASE_ANON_KEY } from './supabase';
import { getInitData } from './telegram';
import { delay } from './utils';
import { ERROR_MESSAGES } from '../constants';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class ApiError extends Error {
  public code?: string;
  public status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  retries?: number;
  timeout?: number;
}

/**
 * Определяет user-friendly сообщение об ошибке
 */
function getUserFriendlyError(error: ApiError): string {
  if (error.status === 404) return ERROR_MESSAGES.NOT_FOUND;
  if (error.status === 401 || error.status === 403) return ERROR_MESSAGES.AUTH_ERROR;
  if (error.status && error.status >= 500) return ERROR_MESSAGES.SERVER_ERROR;

  // Если сообщение от сервера — используем его
  if (error.message && !error.message.includes('HTTP')) {
    return error.message;
  }

  return ERROR_MESSAGES.NETWORK_ERROR;
}

/**
 * Проверяет является ли ошибка retriable
 */
function isRetriableError(error: any): boolean {
  // Retriable: network errors, 408, 429, 5xx
  if (error instanceof TypeError) return true; // Network error
  if (error.status === 408 || error.status === 429) return true; // Timeout, Rate limit
  if (error.status && error.status >= 500) return true; // Server error
  return false;
}

/**
 * Единая точка вызова Supabase Edge Functions.
 * - Всегда использует VITE_SUPABASE_FUNCTIONS_URL
 * - Прикладывает Telegram initData для верификации подписи
 * - Поддерживает retry с экспоненциальной задержкой
 * - Преобразует ошибки в user-friendly формат
 */
export async function callFunction<T = any>(
  name: string,
  body: Record<string, unknown> = {},
  options: CallOptions = {}
): Promise<T> {
  if (!FUNCTIONS_URL) {
    throw new ApiError('VITE_SUPABASE_FUNCTIONS_URL не задан (см. .env.example)', 'CONFIG_ERROR');
  }

  const { method = 'POST', retries = MAX_RETRIES, timeout = 30000 } = options;

  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const initData = getInitData();
      if (!initData) {
        console.warn(`[API] ⚠️ initData не найден для функции ${name}`);
      } else {
        console.log(`[API] Отправка initData: hash=${new URLSearchParams(initData).get('hash')}`);
      }

      const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ ...body, initData }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new ApiError(
          `Ошибка при обработке ответа: HTTP ${response.status}`,
          'PARSE_ERROR',
          response.status
        );
      }

      if (!response.ok || data?.success === false) {
        const errorMsg = data?.error || data?.details || `HTTP ${response.status}`;
        console.error(`[API] ${name} error:`, { status: response.status, error: errorMsg, data });
        throw new ApiError(errorMsg, 'API_ERROR', response.status);
      }

      return data as T;
    } catch (error: any) {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof TypeError ? ERROR_MESSAGES.NETWORK_ERROR : error.message,
            'UNKNOWN_ERROR'
          );

      lastError = apiError;

      // Если это retriable ошибка и есть еще попытки — ждем и повторяем
      if (isRetriableError(apiError) && attempt < retries) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[API] Ошибка ${apiError.code}, повтор ${attempt + 1}/${retries} через ${waitTime}ms`);
        await delay(waitTime);
        continue;
      }

      // Иначе бросаем ошибку
      throw apiError;
    }
  }

  // После всех попыток
  throw lastError || new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 'MAX_RETRIES_EXCEEDED');
}

/**
 * Wrapper для более удобного обработки ошибок в компонентах
 */
export async function callFunctionSafe<T = any>(
  name: string,
  body?: Record<string, unknown>,
  options?: CallOptions
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await callFunction<T>(name, body, options);
    return { data };
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(String(error));
    return { error: getUserFriendlyError(apiError) };
  }
}
