import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { assertInternalCall } from "../_shared/internal-auth.ts";
import {
  botMessages,
  confirmShiftKeyboard,
  rateKeyboard,
  type VacancyInfo,
} from "../_shared/bot-messages.ts";

// Вызывается по расписанию (pg_cron, каждые 10 минут). Делает две вещи:
//   А) за час до начала смены просит фрилансера подтвердить выход;
//   Б) после окончания смены просит обе стороны поставить оценку.
//
// Часовой пояс: время смен (start_time/end_time) хранится без зоны и заведено в
// московском, а сервер живёт в UTC. Поэтому «сейчас» считаем в Europe/Moscow —
// иначе напоминания уезжают на 3 часа.
const TIMEZONE = "Europe/Moscow";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/** Сегодняшняя дата в зоне смен, в формате owner_vacancies.date («2026-07-20»). */
const todayLocal = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/** Текущее время в зоне смен, в минутах от полуночи. */
const nowMinutesLocal = (): number => {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return toMinutes(hhmm);
};

/** «09:30» или «09:30:00» → минуты от полуночи. */
const toMinutes = (time?: string | null): number | null => {
  if (!time) return null;
  const [h, m] = time.split(":");
  const minutes = Number(h) * 60 + Number(m);
  return Number.isFinite(minutes) ? minutes : null;
};

interface MatchRow {
  id: string;
  freelancer_telegram_id: number;
  owner_telegram_id: number;
  confirmed_at: string | null;
  notification_sent: boolean;
  rating_sent: boolean;
  owner_vacancies: VacancyInfo | null;
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function sendMessage(telegramId: number, message: string, replyMarkup?: unknown) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ telegramId, message, parseMode: "HTML", replyMarkup }),
  });

  if (!response.ok) {
    throw new Error(`send-telegram-message failed: ${await response.text()}`);
  }
}

async function fetchName(supabase: Db, telegramId: number): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "Сотрудник";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    assertInternalCall(req);
  } catch (authErr) {
    console.error("Rejected external call:", authErr);
    return new Response(
      JSON.stringify({ error: (authErr as Error).message }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const today = todayLocal();
    const now = nowMinutesLocal();

    // Берём все сегодняшние принятые временные смены, а по времени фильтруем
    // здесь: PostgREST не умеет «start_time - interval '1 hour'», а строк на
    // день — единицы.
    const { data, error } = await supabase
      .from("job_matches")
      .select(
        `id, freelancer_telegram_id, owner_telegram_id, confirmed_at, notification_sent, rating_sent,
         owner_vacancies!inner (address, payment, marketplaces, date, start_time, end_time, type)`
      )
      .eq("status", "accepted")
      .eq("owner_vacancies.type", "temporary")
      .eq("owner_vacancies.date", today);

    if (error) throw error;

    const rows = (data || []) as MatchRow[];
    let reminders = 0;
    let ratingRequests = 0;

    for (const row of rows) {
      const vacancy = row.owner_vacancies;
      if (!vacancy) continue;

      const start = toMinutes(vacancy.start_time);
      const end = toMinutes(vacancy.end_time);

      /* А) За час до начала — просим подтвердить выход. */
      const untilStart = start === null ? null : start - now;
      if (
        !row.notification_sent &&
        !row.confirmed_at &&
        untilStart !== null &&
        untilStart > 0 &&
        untilStart <= 60
      ) {
        await sendMessage(
          row.freelancer_telegram_id,
          botMessages.shiftReminder(vacancy),
          confirmShiftKeyboard(row.id)
        );
        // Ставим флаг сразу после отправки, чтобы следующий запуск крона (через
        // 10 минут) не прислал напоминание повторно.
        await supabase.from("job_matches").update({ notification_sent: true }).eq("id", row.id);
        reminders++;
        continue;
      }

      /* Б) Смена закончилась — просим оценки у обеих сторон. */
      if (row.confirmed_at && !row.rating_sent && end !== null && end < now) {
        const freelancerName = await fetchName(supabase, row.freelancer_telegram_id);

        await sendMessage(
          row.freelancer_telegram_id,
          botMessages.rateOwnerRequest(vacancy),
          rateKeyboard(row.id, "freelancer")
        );
        await sendMessage(
          row.owner_telegram_id,
          botMessages.rateFreelancerRequest(freelancerName, vacancy),
          rateKeyboard(row.id, "owner")
        );

        await supabase.from("job_matches").update({ rating_sent: true }).eq("id", row.id);
        ratingRequests++;
      }
    }

    console.log(
      `shift-notifications: ${today} ${now}min — проверено ${rows.length}, напоминаний ${reminders}, запросов оценки ${ratingRequests}`
    );

    return new Response(
      JSON.stringify({ success: true, checked: rows.length, reminders, ratingRequests }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in shift-notifications:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
