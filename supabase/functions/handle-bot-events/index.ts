import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FUNCTIONS_URL = Deno.env.get("SUPABASE_URL")?.replace(".co", ".co/functions/v1");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

interface BotEvent {
  type: "application_approved" | "application_rejected" | "rating_changed" | "shift_reminder" | "new_applicants" | "onboarding";
  data: Record<string, unknown>;
}

// Отправка сообщения через send-telegram-message функцию
async function sendMessage(telegramId: number, message: string, replyMarkup?: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/send-telegram-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      telegramId,
      message,
      parseMode: "HTML",
      replyMarkup,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send Telegram message: ${await response.text()}`);
  }

  return await response.json();
}

// Получение данных профиля
async function getUserProfile(telegramId: number) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (error) throw error;
  return data;
}

// Обработка события одобренной заявки
async function handleApplicationApproved(telegramId: number, applicationData: Record<string, unknown>) {
  const profile = await getUserProfile(telegramId);
  const message = `✅ Отлично, ${profile.first_name}!

Твоя заявка принята:
🏢 ${applicationData.company_name}
📍 ${applicationData.metro}
⏰ ${applicationData.start_time} — ${applicationData.end_time}
💰 ${applicationData.payment} ₽/день

Контакт работодателя скоро свяжется с тобой.
Не забудь дать обратную связь после смены!`;

  await sendMessage(telegramId, message);
}

// Обработка события отклоненной заявки
async function handleApplicationRejected(telegramId: number, applicationData: Record<string, unknown>) {
  const profile = await getUserProfile(telegramId);
  const message = `😔 Жаль, ${profile.first_name}

К сожалению, твоя заявка на смену в ${applicationData.company_name} не прошла.
Но не расстраивайся! Есть много других интересных предложений.`;

  await sendMessage(telegramId, message);
}

// Обработка события изменения рейтинга
async function handleRatingChanged(telegramId: number, ratingData: Record<string, unknown>) {
  const profile = await getUserProfile(telegramId);

  if (ratingData.new_rating > (ratingData.previous_rating || 0)) {
    const message = `🌟 Поздравляем, ${profile.first_name}!

Твой рейтинг вырос: ${(ratingData.new_rating as number).toFixed(1)} ⭐
(было ${((ratingData.previous_rating as number) || 0).toFixed(1)})

${ratingData.reason || ""}

Так держать! 💪
Работодатели охотнее приглашают сотрудников с высоким рейтингом.`;

    await sendMessage(telegramId, message);
  } else {
    const message = `⚠️ ${profile.first_name}, твой рейтинг снизился до ${(ratingData.new_rating as number).toFixed(1)} ⭐

Причина: ${ratingData.reason || "неизвестно"}

Постарайся улучшить качество работы на следующих смёнах!`;

    await sendMessage(telegramId, message);
  }
}

// Обработка события напоминания о смене
async function handleShiftReminder(telegramId: number, shiftData: Record<string, unknown>) {
  const profile = await getUserProfile(telegramId);
  const message = `⏰ Напоминание, ${profile.first_name}!

Через 2 часа твоя смена:
🏢 ${shiftData.company_name}
📍 ${shiftData.metro}
⏰ ${shiftData.start_time} — ${shiftData.end_time}

Убедись что ты в курсе контактов и адреса!`;

  await sendMessage(telegramId, message);
}

// Обработка события новых откликов (для владельцев)
async function handleNewApplicants(telegramId: number, applicantData: Record<string, unknown>) {
  const profile = await getUserProfile(telegramId);
  const message = `📋 У тебя новые отклики!

На вакансию "${applicantData.vacancy_title}" откликнулось ${applicantData.count} человек.

Срочно закрой вакансию и выбери лучшего!`;

  await sendMessage(telegramId, message);
}

// Обработка события регистрации (Onboarding)
async function handleOnboarding(telegramId: number) {
  const profile = await getUserProfile(telegramId);
  const message = `👋 Привет, ${profile.first_name}! Я ПроПункт Бот 🤖

Я буду помогать тебе:
✓ Находить подходящие смены
✓ Отслеживать статус твоих заявок
✓ Уведомлять о новых возможностях

Начнём с того, что создашь свой профиль в приложении?`;

  await sendMessage(telegramId, message);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const event = await req.json() as BotEvent;

    console.log("Processing bot event:", event.type);

    // Получаем telegram_id из данных события
    const telegramId = event.data.telegram_id as number;

    if (!telegramId) {
      return new Response(
        JSON.stringify({ error: "Missing telegram_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Обработка разных типов событий
    switch (event.type) {
      case "application_approved":
        await handleApplicationApproved(telegramId, event.data);
        break;

      case "application_rejected":
        await handleApplicationRejected(telegramId, event.data);
        break;

      case "rating_changed":
        await handleRatingChanged(telegramId, event.data);
        break;

      case "shift_reminder":
        await handleShiftReminder(telegramId, event.data);
        break;

      case "new_applicants":
        await handleNewApplicants(telegramId, event.data);
        break;

      case "onboarding":
        await handleOnboarding(telegramId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Unknown event type" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, event: event.type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error handling bot event:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
