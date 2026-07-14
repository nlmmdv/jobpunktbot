interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Получить значение из кэша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Проверяем TTL (time to live)
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Установить значение в кэш
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Удалить значение из кэша
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Получить или вычислить значение
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) {
      console.log(`[Cache] Hit for key: ${key}`);
      return cached;
    }

    console.log(`[Cache] Miss for key: ${key}, fetching...`);
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

// Синглтон кэша
export const apiCache = new ApiCache();

/**
 * Генерирует ключ кэша из функции и параметров
 */
export const getCacheKey = (functionName: string, params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) {
    return functionName;
  }

  const paramString = JSON.stringify(params);
  return `${functionName}:${paramString}`;
};
