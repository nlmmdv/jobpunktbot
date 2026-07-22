import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { owner_id } = await req.json();

    if (!owner_id) {
      return new Response(
        JSON.stringify({ error: 'Missing owner_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Получить текущего пользователя
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Проверить активные блокировки компании
    const { data: blocks, error } = await supabase
      .from('company_blocks')
      .select('id, reason, duration_minutes, unblock_at, status')
      .eq('blocked_company_id', owner_id)
      .eq('status', 'active')
      .order('blocked_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const isBlocked = blocks && blocks.length > 0;
    const block = blocks?.[0];

    return new Response(
      JSON.stringify({
        is_blocked: isBlocked,
        blocks: blocks || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
