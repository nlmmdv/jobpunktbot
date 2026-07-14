import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  console.log("[tg-auth] START");

  if (req.method === "OPTIONS") {
    console.log("[tg-auth] OPTIONS");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[tg-auth] Parsing body");
    const body = await req.json().catch((e) => {
      console.error("[tg-auth] JSON parse error:", e);
      return null;
    });

    console.log("[tg-auth] Body parsed, extracting initData");
    const initData = body?.initData;

    if (!initData) {
      console.log("[tg-auth] No initData");
      return new Response(JSON.stringify({ success: false, error: "No initData" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("[tg-auth] initData length:", initData?.length);
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    const hash = params.get("hash");

    console.log(`[tg-auth] hash=${hash}, user present=${!!userRaw}`);

    if (!userRaw) {
      console.log("[tg-auth] No user in initData");
      return new Response(JSON.stringify({ success: false, error: "No user", profile: null }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let user;
    try {
      user = JSON.parse(userRaw);
      console.log(`[tg-auth] User parsed: id=${user.id}, name=${user.first_name}`);
    } catch (e) {
      console.error("[tg-auth] Failed to parse user JSON:", e);
      return new Response(JSON.stringify({ success: false, error: "Invalid user JSON", profile: null }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Возвращаем что пользователь не зарегистрирован (требует регистрации)
    console.log("[tg-auth] User not registered, returning null profile");
    return new Response(JSON.stringify({ success: true, profile: null }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("[tg-auth] ERROR:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
