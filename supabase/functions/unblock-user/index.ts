import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { block_id } = await req.json();

    if (!block_id) {
      return new Response(
        JSON.stringify({ error: 'Missing block_id' }),
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

    // Получить профиль администратора
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('telegram_id', parseInt(userData.user.user_metadata?.telegram_id || '0'))
      .single();

    if (adminProfile?.role !== 'administrator' && adminProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can unblock users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Обновить статус блокировки
    const { data: block, error } = await supabase
      .from('user_blocks')
      .update({ status: 'manually_unblocked' })
      .eq('id', block_id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ block }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
