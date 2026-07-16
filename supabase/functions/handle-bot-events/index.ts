import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { assertInternalCall } from "../_shared/internal-auth.ts";
import { botMessages, type Role, type VacancyInfo } from "../_shared/bot-messages.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Событий про рейтинг, статистику и напоминания здесь нет намеренно: рейтинга в
// схеме не существует (profiles.rating), а напоминания требуют планировщика.
type BotEventType =
  | "onboarding"
  | "new_application"
  | "new_offer"
  | "match_accepted"
  | "match_rejected";

interface BotEvent {
  type: BotEventType;
  data: {
    /** Кому шлём. */
    telegram_id: number;
    vacancy?: VacancyInfo;
    /** Для onboarding — у сотрудника и владельца разные тексты. */
    role?: Role;
    /** Для new_application — имя откликнувшегося. */
    applicant_name?: string;
    /** Для match_accepted — контакт второй стороны. */
    contact_username?: string | null;
  };
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const event = (await req.json()) as BotEvent;
    const telegramId = event.data?.telegram_id;

    if (!telegramId) {
      return new Response(
        JSON.stringify({ error: "Missing telegram_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Профиль нужен только ради имени в обращении — его отсутствие не повод падать.
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    const firstName = profile?.first_name || "друг";
    const vacancy = event.data.vacancy || {};

    let message: string;
    switch (event.type) {
      case "onboarding":
        message = botMessages.onboarding(firstName, event.data.role === "owner" ? "owner" : "employee");
        break;
      case "new_application":
        message = botMessages.newApplication(firstName, event.data.applicant_name || "Кандидат", vacancy);
        break;
      case "new_offer":
        message = botMessages.newOffer(firstName, vacancy);
        break;
      case "match_accepted":
        message = botMessages.matchAccepted(firstName, vacancy, event.data.contact_username);
        break;
      case "match_rejected":
        message = botMessages.matchRejected(firstName, vacancy);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown event type" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ telegramId, message }),
    });

    if (!response.ok) {
      throw new Error(`send-telegram-message failed: ${await response.text()}`);
    }

    console.log(`Bot event handled: ${event.type} -> telegram_id=${telegramId}`);
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
