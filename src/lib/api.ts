import { SUPABASE_ANON_KEY } from './supabase';
import { getInitData } from './telegram';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;

export class ApiError extends Error {}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

/**
 * Единая точка вызова Supabase Edge Functions.
 * Всегда бьёт в VITE_SUPABASE_FUNCTIONS_URL (а не в захардкоженный URL)
 * и всегда прикладывает Telegram initData, чтобы бэкенд мог проверить подпись,
 * а не доверять telegramId из тела запроса.
 */
export async function callFunction<T = any>(
  name: string,
  body: Record<string, unknown> = {},
  options: CallOptions = {}
): Promise<T> {
  if (!FUNCTIONS_URL) {
    throw new ApiError('VITE_SUPABASE_FUNCTIONS_URL не задан (см. .env.example)');
  }

  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ ...body, initData: getInitData() }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(`Ошибка сервера: HTTP ${response.status}`);
  }

  if (!response.ok || data?.success === false || data?.error) {
    throw new ApiError(data?.error || data?.details || `Ошибка сервера: HTTP ${response.status}`);
  }

  return data as T;
}
