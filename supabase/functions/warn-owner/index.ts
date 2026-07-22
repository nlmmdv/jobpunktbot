import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { warned_owner_id, reason, severity = 'mild' } = await req.json();

    if (!warned_owner_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: warned_owner_id, reason' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['mild', 'moderate', 'severe'].includes(severity)) {
      return new Response(
        JSON.stringify({ error: 'Invalid severity. Must be: mild, moderate, severe' }),
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
      .select('id, role')
      .eq('telegram_id', parseInt(userData.user.user_metadata?.telegram_id || '0'))
      .single();

    if (!adminProfile) {
      return new Response(JSON.stringify({ error: 'Admin profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (adminProfile.role !== 'administrator' && adminProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can warn owners' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Получить количество предыдущих предупреждений владельца
    const { data: prevWarnings } = await supabase
      .from('owner_warnings')
      .select('id')
      .eq('warned_owner_id', warned_owner_id);

    const warningCount = prevWarnings?.length || 0;

    // Если 3+ предупреждения - автоматически заблокировать
    let autoBlock = null;
    if (warningCount >= 2) {
      // Заблокировать на 7 дней после 3 предупреждения
      const { data: block } = await supabase
        .from('owner_blocks')
        .insert({
          blocked_owner_id: warned_owner_id,
          blocked_by_admin_id: adminProfile.id,
          reason: `Автоматическая блокировка после ${warningCount + 1} предупреждения`,
          duration_minutes: 7 * 24 * 60, // 7 дней
          unblock_at: new Date(Date.now() + 7 * 24 * 60 * 60000),
        })
        .select()
        .single();

      autoBlock = block;
    }

    // Создать предупреждение владельца
    const { data: warning, error } = await supabase
      .from('owner_warnings')
      .insert({
        warned_owner_id,
        warned_by_admin_id: adminProfile.id,
        reason,
        severity,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        warning,
        auto_blocked: autoBlock ? true : false,
        block: autoBlock,
        warning_count: warningCount + 1,
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
