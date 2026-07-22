import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Получить активные блокировки
    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocked_user_id', user_id)
      .eq('status', 'active');

    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ is_blocked: false, blocks: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверить истекшие блокировки и обновить статус
    const now = new Date();
    const expiredBlockIds = blocks
      .filter((b) => b.unblock_at && new Date(b.unblock_at) <= now)
      .map((b) => b.id);

    if (expiredBlockIds.length > 0) {
      await supabase
        .from('user_blocks')
        .update({ status: 'expired' })
        .in('id', expiredBlockIds);
    }

    // Фильтруем только активные блокировки
    const activeBlocks = blocks.filter((b) => !b.unblock_at || new Date(b.unblock_at) > now);

    return new Response(
      JSON.stringify({
        is_blocked: activeBlocks.length > 0,
        blocks: activeBlocks.map((b) => ({
          id: b.id,
          reason: b.reason,
          blocked_at: b.blocked_at,
          unblock_at: b.unblock_at,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
