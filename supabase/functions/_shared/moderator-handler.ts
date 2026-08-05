import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "./cors.ts";
import { requireTelegramId } from "./telegram-auth.ts";

/**
 * Обвязка для функций модерации: CORS, разбор тела, проверка подписи Telegram и
 * готовый service_role клиент. Вынесена, чтобы одинаковый боилерплейт не
 * дублировался в каждой функции.
 *
 * Ошибка авторизации отдаёт 401, всё остальное — 500 с текстом; коды «(403)» в
 * сообщении означают отказ по правам и превращаются в 403.
 */
export async function handleModeratorRequest<T extends Record<string, unknown>>(
  req: Request,
  handler: (
    supabase: ReturnType<typeof createClient>,
    telegramId: number,
    body: Record<string, unknown>
  ) => Promise<T>
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
  }

  let telegramId: number;
  try {
    telegramId = await requireTelegramId(body as { initData?: string });
  } catch (authErr) {
    console.error("Auth error:", authErr);
    return jsonResponse({ success: false, error: (authErr as Error).message }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    return jsonResponse({ success: false, error: "Server configuration error" }, 500);
  }

  try {
    const result = await handler(createClient(supabaseUrl, supabaseKey), telegramId, body);
    return jsonResponse({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Moderation error:", message);
    return jsonResponse({ success: false, error: message }, message.includes("(403)") ? 403 : 500);
  }
}
