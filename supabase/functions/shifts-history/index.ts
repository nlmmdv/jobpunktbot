import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface CompletedShift {
  id: string;
  company_name?: string;
  freelancer_name?: string;
  location_address: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  date: string;
  status: "completed" | "cancelled";
  owner_name?: string;
  freelancer_id?: string;
  owner_id?: string;
  freelancer_telegram_username?: string;
  owner_telegram_username?: string;
  total_hours: number;
  total_earnings?: number;
  total_cost?: number;
  freelancer_rating?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reqBody = await req.json();
  const { user_id, owner_id, user_type } = reqBody;

  // Determine actual user context
  let userId = user_id || data.user.id;
  let ownerId = owner_id;

  try {
    if (user_type === "freelancer") {
      // Get freelancer's completed shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shifts")
        .select(
          `id, date, start_time, end_time, hourly_rate, status,
           total_hours, location_address, owner_id, owner:owner_profiles(id, first_name, last_name, telegram_username),
           vacancy:vacancies(id, title, company:companies(id, name))`
        )
        .eq("freelancer_id", userId)
        .in("status", ["completed", "cancelled"])
        .order("date", { ascending: false });

      if (shiftsError) throw shiftsError;

      const shifts: CompletedShift[] = (shiftsData || []).map((shift: any) => ({
        id: shift.id,
        freelancer_id: userId,
        location_address: shift.location_address,
        start_time: shift.start_time,
        end_time: shift.end_time,
        hourly_rate: shift.hourly_rate,
        date: shift.date,
        status: shift.status,
        owner_name: shift.owner
          ? `${shift.owner.first_name} ${shift.owner.last_name || ""}`.trim()
          : "Unknown",
        owner_id: shift.owner_id,
        owner_telegram_username: shift.owner?.telegram_username,
        total_hours: shift.total_hours || 0,
        total_earnings: (shift.total_hours || 0) * shift.hourly_rate,
      }));

      return new Response(JSON.stringify({ shifts }), {
        headers: { "Content-Type": "application/json" },
      });
    } else if (user_type === "owner") {
      // Get owner's completed shifts with freelancers
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shifts")
        .select(
          `id, date, start_time, end_time, hourly_rate, status,
           total_hours, location_address, freelancer_id,
           freelancer:profiles(id, first_name, last_name, telegram_username, rating),
           vacancy:vacancies(id, title, company:companies(id, name))`
        )
        .eq("owner_id", ownerId)
        .in("status", ["completed", "cancelled"])
        .order("date", { ascending: false });

      if (shiftsError) throw shiftsError;

      const shifts: CompletedShift[] = (shiftsData || []).map((shift: any) => ({
        id: shift.id,
        freelancer_id: shift.freelancer_id,
        location_address: shift.location_address,
        start_time: shift.start_time,
        end_time: shift.end_time,
        hourly_rate: shift.hourly_rate,
        date: shift.date,
        status: shift.status,
        freelancer_name: shift.freelancer
          ? `${shift.freelancer.first_name} ${shift.freelancer.last_name || ""}`.trim()
          : "Unknown",
        freelancer_telegram_username: shift.freelancer?.telegram_username,
        freelancer_rating: shift.freelancer?.rating,
        total_hours: shift.total_hours || 0,
        total_cost: (shift.total_hours || 0) * shift.hourly_rate,
      }));

      return new Response(JSON.stringify({ shifts }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid user_type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Error fetching shifts history:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
