import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { blocked_user_id, duration_minutes, reason } = await req.json();

    if (!blocked_user_id || !duration_minutes || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: blocked_user_id, duration_minutes, reason' }),
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
      .select('id')
      .eq('telegram_id', parseInt(userData.user.user_metadata?.telegram_id || '0'))
      .single();

    if (!adminProfile) {
      return new Response(JSON.stringify({ error: 'Admin profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Проверить что пользователь администратор
    const { data: adminRole } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminProfile.id)
      .single();

    if (adminRole?.role !== 'administrator' && adminRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can block users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверить что пользователь уже заблокирован
    const { data: existingBlock } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocked_user_id', blocked_user_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingBlock) {
      return new Response(
        JSON.stringify({ error: 'User is already blocked' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Вычислить время разблокировки
    const unblockAt = duration_minutes === 0
      ? null
      : new Date(Date.now() + duration_minutes * 60000);

    // Создать блокировку
    const { data: block, error } = await supabase
      .from('user_blocks')
      .insert({
        blocked_user_id,
        blocked_by_admin_id: adminProfile.id,
        reason,
        duration_minutes,
        unblock_at: unblockAt,
      })
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
