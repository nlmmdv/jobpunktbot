import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders, jsonResponse } from "./cors.ts";
import { requireTelegramId } from "./telegram-auth.ts";

/**
 * Единая обработка для всех Edge Functions
 * Избегает дублирования боилерплейта (OPTIONS, auth, supabase init)
 */
export async function handleEdgeFunction<T extends Record<string, unknown>>(
  req: Request,
  handler: (
    supabase: ReturnType<typeof createClient>,
    telegramId: number,
    body: Record<string, unknown>
  ) => Promise<T>
): Promise<Response> {
  // Обработка CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Парсим тело запроса
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // Проверяем Telegram ID
    let telegramId: number;
    try {
      telegramId = await requireTelegramId(body);
    } catch (authErr) {
      console.error("Auth error:", authErr);
      return jsonResponse(
        { success: false, error: (authErr as Error).message },
        401
      );
    }

    // Инициализируем Supabase клиент
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return jsonResponse(
        { success: false, error: "Server configuration error" },
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Вызываем обработчик с готовыми параметрами
    const result = await handler(supabase, telegramId, body);

    return jsonResponse({ success: true, ...result });
  } catch (err) {
    console.error("Unhandled error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
}

/**
 * Вариант для функций которые не требуют Telegram ID (публичные)
 */
export async function handlePublicEdgeFunction<T extends Record<string, unknown>>(
  req: Request,
  handler: (
    supabase: ReturnType<typeof createClient>,
    body: Record<string, unknown>
  ) => Promise<T>
): Promise<Response> {
  // Обработка CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Парсим тело запроса
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // Инициализируем Supabase клиент
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return jsonResponse(
        { success: false, error: "Server configuration error" },
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Вызываем обработчик с готовыми параметрами
    const result = await handler(supabase, body);

    return jsonResponse({ success: true, ...result });
  } catch (err) {
    console.error("Unhandled error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
}
