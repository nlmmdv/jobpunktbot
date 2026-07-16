import { handlePublicEdgeFunction } from "../_shared/edge-function-utils.ts";

// Публичный поиск фрилансеров не требует авторизации, но не должен отдавать
// персональные данные (телефон, telegram_id) незнакомым вызывающим
const PUBLIC_COLUMNS =
  "id, first_name, last_name, city, about, photo_url, marketplaces, preferred_schedule, hourly_rate, metro_stations";

Deno.serve((req) =>
  handlePublicEdgeFunction(req, async (supabase, body) => {
    const { city, marketplace } = body;

    let query = supabase
      .from("freelancer_resumes")
      .select(PUBLIC_COLUMNS)
      .eq("status", "active");

    if (city && city !== "Все") {
      query = query.eq("city", city);
    }

    if (marketplace && marketplace !== "Все") {
      query = query.contains("marketplaces", [marketplace]);
    }

    const { data: freelancers, error } = await query;

    if (error) throw error;

    return { freelancers: freelancers || [] };
  })
);
