// Средний рейтинг и число оценок по получателю (to_telegram_id) из таблицы
// ratings. Считаем в одном запросе на весь набор id и агрегируем в JS —
// PostgREST не умеет GROUP BY AVG без RPC, а оценок мало.

export interface RatingSummary {
  avg_rating: number | null;
  rating_count: number;
}

export const EMPTY_RATING: RatingSummary = { avg_rating: null, rating_count: 0 };

// deno-lint-ignore no-explicit-any
export async function ratingsFor(supabase: any, telegramIds: Array<number | null | undefined>) {
  const ids = [...new Set(telegramIds.filter((x): x is number => Boolean(x)))];
  const result = new Map<number, RatingSummary>();
  if (ids.length === 0) return result;

  const { data, error } = await supabase
    .from("ratings")
    .select("to_telegram_id, rating")
    .in("to_telegram_id", ids);

  if (error) throw error;

  const acc = new Map<number, { sum: number; count: number }>();
  for (const row of data || []) {
    const cur = acc.get(row.to_telegram_id) || { sum: 0, count: 0 };
    cur.sum += row.rating;
    cur.count += 1;
    acc.set(row.to_telegram_id, cur);
  }

  for (const id of ids) {
    const c = acc.get(id);
    result.set(
      id,
      c ? { avg_rating: Math.round((c.sum / c.count) * 10) / 10, rating_count: c.count } : { ...EMPTY_RATING }
    );
  }
  return result;
}

/** Рейтинг для одного получателя. */
// deno-lint-ignore no-explicit-any
export async function ratingFor(supabase: any, telegramId: number | null | undefined): Promise<RatingSummary> {
  if (!telegramId) return { ...EMPTY_RATING };
  const map = await ratingsFor(supabase, [telegramId]);
  return map.get(telegramId) || { ...EMPTY_RATING };
}
