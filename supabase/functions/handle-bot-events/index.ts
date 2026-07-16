import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

const FUNCTIONS_URL = Deno.env.get("SUPABASE_URL")?.replace(".co", ".co/functions/v1");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface BotEvent {
  type: "application_approved" | "application_rejected" | "rating_changed" | "shift_reminder" | "new_applicants" | "onboarding";
  data: Record<string, unknown>;
}

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

async function getUserProfile(supabase: any, telegramId: number) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (error) throw error;
  return data;
}

async function handleApplicationApproved(supabase: any, telegramId: number, applicationData: Record<string, unknown>) {
  const profile = await getUserProfile(supabase, telegramId);
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

async function handleApplicationRejected(supabase: any, telegramId: number, applicationData: Record<string, unknown>) {
  const profile = await getUserProfile(supabase, telegramId);
  const message = `😔 Жаль, ${profile.first_name}

К сожалению, твоя заявка на смену в ${applicationData.company_name} не прошла.
Но не расстраивайся! Есть много других интересных предложений.`;

  await sendMessage(telegramId, message);
}

async function handleRatingChanged(supabase: any, telegramId: number, ratingData: Record<string, unknown>) {
  const profile = await getUserProfile(supabase, telegramId);

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

async function handleShiftReminder(supabase: any, telegramId: number, shiftData: Record<string, unknown>) {
  const profile = await getUserProfile(supabase, telegramId);
  const message = `⏰ Напоминание, ${profile.first_name}!

Через 2 часа твоя смена:
🏢 ${shiftData.company_name}
📍 ${shiftData.metro}
⏰ ${shiftData.start_time} — ${shiftData.end_time}

Убедись что ты в курсе контактов и адреса!`;

  await sendMessage(telegramId, message);
}

async function handleNewApplicants(supabase: any, telegramId: number, applicantData: Record<string, unknown>) {
  const profile = await getUserProfile(supabase, telegramId);
  const message = `📋 У тебя новые отклики!

На вакансию "${applicantData.vacancy_title}" откликнулось ${applicantData.count} человек.

Срочно закрой вакансию и выбери лучшего!`;

  await sendMessage(telegramId, message);
}

async function handleOnboarding(supabase: any, telegramId: number) {
  const profile = await getUserProfile(supabase, telegramId);
  const message = `👋 Привет, ${profile.first_name}! Я ПроПункт Бот 🤖

Я буду помогать тебе:
✓ Находить подходящие смены
✓ Отслеживать статус твоих заявок
✓ Уведомлять о новых возможностях

Начнём с того, что создашь свой профиль в приложении?`;

  await sendMessage(telegramId, message);
}

Deno.serve((req) =>
  handlePublicEdgeFunction(req, async (supabase, body) => {
    const event = body as BotEvent;

    console.log("Processing bot event:", event.type);

    const telegramId = event.data.telegram_id as number;

    if (!telegramId) {
      throw new Error("Missing telegram_id");
    }

    switch (event.type) {
      case "application_approved":
        await handleApplicationApproved(supabase, telegramId, event.data);
        break;

      case "application_rejected":
        await handleApplicationRejected(supabase, telegramId, event.data);
        break;

      case "rating_changed":
        await handleRatingChanged(supabase, telegramId, event.data);
        break;

      case "shift_reminder":
        await handleShiftReminder(supabase, telegramId, event.data);
        break;

      case "new_applicants":
        await handleNewApplicants(supabase, telegramId, event.data);
        break;

      case "onboarding":
        await handleOnboarding(supabase, telegramId);
        break;

      default:
        throw new Error("Unknown event type");
    }

    return { event: event.type };
  })
);
