-- 006_bot_states.sql
-- Состояние диалога пользователя с ботом.
--
-- Используется для отслеживания, ждём ли обратную связь от пользователя
-- (состояние "waiting_feedback"), и для других будущих состояний диалога.

CREATE TABLE IF NOT EXISTS public.bot_states (
  telegram_id bigint PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('waiting_feedback')),
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_states_state ON public.bot_states (state);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Edge-функции работают под service_role (обходят RLS). Клиент не обращается,
-- поэтому включаем RLS без политик.
ALTER TABLE public.bot_states ENABLE ROW LEVEL SECURITY;
