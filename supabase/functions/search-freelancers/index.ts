import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { ratingsFor, EMPTY_RATING } from "../_shared/ratings.ts";

// Поиск сотрудников для владельца. Два разных вида предложения труда:
//   permanent — резюме (freelancer_resumes): человек ищет работу вообще;
//   temporary — заявки на подработку (freelancer_shifts): конкретные даты, когда
//               человек готов выйти на замену.
//
// Публичный поиск не требует авторизации, но не отдаёт персональные данные
// (телефон, telegram_id). telegram_id тянем ВНУТРЕННЕ — для рейтинга — и
// вырезаем из ответа. Наружу отдаём id резюме: по нему делается предложение
// смены (job-matches резолвит telegram_id сам).

const RESUME_PUBLIC =
  "id, first_name, last_name, city, about, photo_url, marketplaces, preferred_schedule, hourly_rate, metro_stations";
const RESUME_INTERNAL = `${RESUME_PUBLIC}, telegram_id`;

/** Сегодня по Москве — смены заведены в этом поясе. */
const todayMoscow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { city, marketplace, type, fromDate } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    /* ── Замены: заявки на конкретные даты ──────────────────────────────── */
    if (type === "temporary") {
      // Ищем от указанной даты, но не раньше сегодня — прошедшие смены
      // предлагать бессмысленно, даже если клиент прислал старую дату.
      const today = todayMoscow();
      const since = fromDate && fromDate > today ? fromDate : today;

      const { data: shifts, error: shiftsError } = await supabase
        .from("freelancer_shifts")
        .select("id, telegram_id, date, start_time, end_time, rate, marketplaces, metro")
        .gte("date", since)
        .order("date", { ascending: true });

      if (shiftsError) throw shiftsError;

      const rows = shifts || [];
      const ids = [...new Set(rows.map((s: { telegram_id: number }) => s.telegram_id))];
      if (ids.length === 0) {
        return jsonResponse({ success: true, freelancers: [] });
      }

      // У смены нет города и имени — берём их из резюме автора. Заодно это
      // отсеивает заявки без активного резюме: предложить смену такому нельзя.
      const [{ data: resumes, error: resumesError }, ratings] = await Promise.all([
        supabase
          .from("freelancer_resumes")
          .select("id, telegram_id, first_name, last_name, city")
          .in("telegram_id", ids)
          .eq("status", "active"),
        ratingsFor(supabase, ids),
      ]);

      if (resumesError) throw resumesError;

      const byTelegramId = new Map(
        (resumes || []).map((r: { telegram_id: number }) => [r.telegram_id, r])
      );

      const result = rows
        .map((shift: any) => {
          const resume = byTelegramId.get(shift.telegram_id) as any;
          if (!resume) return null;
          if (city && city !== "Все" && resume.city !== city) return null;
          if (marketplace && marketplace !== "Все" && !(shift.marketplaces || []).includes(marketplace)) {
            return null;
          }

          return {
            // id резюме — по нему уходит предложение смены.
            id: resume.id,
            shift_id: shift.id,
            first_name: resume.first_name,
            last_name: resume.last_name,
            city: resume.city,
            date: shift.date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            hourly_rate: shift.rate,
            marketplaces: shift.marketplaces || [],
            // Имя поля общее с резюме, чтобы фильтр по метро на клиенте работал
            // одинаково для обеих вкладок.
            metro_stations: shift.metro || [],
            ...(ratings.get(shift.telegram_id) || EMPTY_RATING),
          };
        })
        .filter(Boolean);

      return jsonResponse({ success: true, freelancers: result });
    }

    /* ── Постоянные: резюме ─────────────────────────────────────────────── */
    let query = supabase.from("freelancer_resumes").select(RESUME_INTERNAL).eq("status", "active");

    if (city && city !== "Все") {
      query = query.eq("city", city);
    }

    if (marketplace && marketplace !== "Все") {
      query = query.contains("marketplaces", [marketplace]);
    }

    const { data: freelancers, error } = await query;

    if (error) throw error;

    const rows = freelancers || [];
    const ratings = await ratingsFor(supabase, rows.map((f: { telegram_id?: number }) => f.telegram_id));

    // telegram_id вырезаем из ответа — наружу его не отдаём.
    const withRatings = rows.map(({ telegram_id, ...f }: { telegram_id?: number }) => ({
      ...f,
      ...(ratings.get(telegram_id as number) || EMPTY_RATING),
    }));

    return jsonResponse({ success: true, freelancers: withRatings });
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
