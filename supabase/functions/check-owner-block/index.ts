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

    // Получить активные блокировки
    const { data: blocks } = await supabase
      .from('owner_blocks')
      .select('id, reason, unblock_at, status')
      .eq('blocked_owner_id', owner_id);

    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ is_blocked: false, blocks: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверить какие блокировки ещё активны
    const now = new Date();
    const activeBlocks = blocks.filter((block) => {
      if (block.status === 'expired' || block.status === 'manually_unblocked') {
        return false;
      }
      if (block.unblock_at) {
        return new Date(block.unblock_at) > now;
      }
      return true; // Постоянная блокировка
    });

    // Если есть истёкшие блокировки - обновить их статус
    if (activeBlocks.length < blocks.length) {
      const expiredBlockIds = blocks
        .filter((b) => !activeBlocks.includes(b))
        .map((b) => b.id);

      for (const blockId of expiredBlockIds) {
        await supabase
          .from('owner_blocks')
          .update({ status: 'expired' })
          .eq('id', blockId);
      }
    }

    const isBlocked = activeBlocks.length > 0;

    return new Response(
      JSON.stringify({
        is_blocked: isBlocked,
        blocks: activeBlocks.map((b) => ({
          reason: b.reason,
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
