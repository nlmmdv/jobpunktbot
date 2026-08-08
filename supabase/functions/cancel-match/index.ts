import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireTelegramId } from "../_shared/telegram-auth.ts";
import { assertNotBlocked, BlockedError } from "../_shared/moderation.ts";
import { assertRateLimit, RateLimitError } from "../_shared/rate-limit.ts";
import { botMessages } from "../_shared/bot-messages.ts";
import { hoursUntilShift, penaltyFor, type CancelRole } from "../_shared/cancellation.ts";

// Отмена подтверждённой смены. Штраф зависит от того, за сколько часов до начала
// отменяют, и кто отменяет (фрилансеру некем закрыть смену — с него строже).
//
// Роль НЕ берём из тела запроса: её определяем по тому, кем отправитель является
// в самой записи. Иначе, передав чужой match_id и role, можно было бы отменить
// чужую смену и повесить штраф на другого человека.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function notify(telegramId: number, message: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ telegramId, message, parseMode: "HTML" }),
    });
    if (!response.ok) {
      console.error("Cancel notification failed:", await response.text());
    }
  } catch (err) {
    // Уведомление вторично: отмена уже произошла, ронять ответ из-за бота нельзя.
    console.error("Cancel notification failed:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { match_id } = body;

    let telegramId: number;
    try {
      telegramId = await requireTelegramId(body);
    } catch (authErr) {
      console.error("Auth error:", authErr);
      return jsonResponse({ success: false, error: (authErr as Error).message }, 401);
    }

    assertRateLimit(telegramId);

    if (!match_id) {
      return jsonResponse({ success: false, error: "Missing match_id" }, 400);
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Заблокированный аккаунт не должен действовать в обход интерфейса:
    // подпись у него остаётся валидной, а вход в приложение он миновать может.
    await assertNotBlocked(supabase, telegramId);

    const { data: match, error: matchError } = await supabase
      .from("job_matches")
      .select("id, status, vacancy_id, freelancer_telegram_id, owner_telegram_id")
      .eq("id", match_id)
      .maybeSingle();

    if (matchError) throw matchError;
    if (!match) {
      return jsonResponse({ success: false, error: "Смена не найдена" }, 404);
    }

    // Роль выводим из записи — так отменить чужую смену не получится.
    let role: CancelRole;
    if (telegramId === match.freelancer_telegram_id) {
      role = "freelancer";
    } else if (telegramId === match.owner_telegram_id) {
      role = "owner";
    } else {
      console.error(`Rejected cancel: telegram_id=${telegramId}, match=${match_id}`);
      return jsonResponse({ success: false, error: "Это не ваша смена" }, 403);
    }

    if (match.status === "cancelled") {
      return jsonResponse({ success: false, error: "Смена уже отменена" }, 409);
    }

    const { data: vacancy, error: vacancyError } = await supabase
      .from("owner_vacancies")
      .select("address, payment, marketplaces, date, start_time, end_time")
      .eq("id", match.vacancy_id)
      .maybeSingle();

    if (vacancyError) throw vacancyError;

    const hoursUntil = vacancy?.date ? hoursUntilShift(vacancy.date, vacancy.start_time) : Number.POSITIVE_INFINITY;
    const { penalty, reason } = penaltyFor(role, hoursUntil);

    const { error: updateError } = await supabase
      .from("job_matches")
      .update({
        status: "cancelled",
        cancelled_by: role,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", match_id);

    if (updateError) throw updateError;

    if (penalty !== 0) {
      const { error: penaltyError } = await supabase.from("cancellation_penalties").insert({
        match_id,
        telegram_id: telegramId,
        penalty,
        reason,
        hours_before: Number.isFinite(hoursUntil) ? Math.round(hoursUntil * 10) / 10 : null,
      });
      // Штраф не должен отменять саму отмену — логируем и продолжаем.
      if (penaltyError) console.error("Failed to save penalty:", penaltyError);
    }

    if (role === "freelancer") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Сотрудник";
      await notify(match.owner_telegram_id, botMessages.shiftCancelledToOwner(name, vacancy || {}));
    } else {
      await notify(match.freelancer_telegram_id, botMessages.shiftCancelledByOwner(vacancy || {}));
    }

    console.log(`Match ${match_id} cancelled by ${role}, penalty=${penalty}`);
    return jsonResponse({ success: true, penalty, reason });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonResponse({ success: false, error: err.message }, 429);
    }
    if (err instanceof BlockedError) {
      return jsonResponse({ success: false, error: err.message }, 403);
    }
    console.error("Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});
