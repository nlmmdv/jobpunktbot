-- 008_shift_incidents.sql — неявка на смену: сигнал владельцу и жалоба модератору
--
-- ⚠️ ПРИМЕНЯТЬ ТОЛЬКО ВРУЧНУЮ через SQL Editor и в транзакции.
-- НЕ запускать `supabase db push`: база общая с большой платформой ПВЗ.
--
-- Строго аддитивно: только новые таблицы. job_matches не трогаем — флаги
-- отправленных сигналов держим у себя (shift_alerts), чтобы не добавлять
-- колонки в таблицу, которая живёт в общей базе.

DO $$
DECLARE
  conflicts text := '';
BEGIN
  IF to_regclass('public.shift_incidents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'shift_incidents'
         AND column_name = 'match_id'
     )
  THEN
    conflicts := conflicts || ' shift_incidents';
  END IF;

  IF to_regclass('public.shift_alerts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'shift_alerts'
         AND column_name = 'alert_kind'
     )
  THEN
    conflicts := conflicts || ' shift_alerts';
  END IF;

  IF conflicts <> '' THEN
    RAISE EXCEPTION
      'Конфликт имён таблиц:%. Они принадлежат не этому репозиторию. Миграция остановлена.',
      conflicts;
  END IF;
END $$;

CREATE TEMP TABLE _pre_existing AS
SELECT t FROM unnest(ARRAY['shift_incidents', 'shift_alerts']) AS t
WHERE to_regclass('public.' || t) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Что уже отправлено по смене. Крон бегает каждые 10 минут — без этой отметки
-- владелец получал бы одно и то же сообщение снова и снова.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  alert_kind TEXT NOT NULL,               -- 'no_confirmation_owner'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (match_id, alert_kind)
);

-- ---------------------------------------------------------------------------
-- Инцидент по смене: владелец нажал «Не вышел».
-- Это и есть жалоба, но привязанная к конкретной смене — значит проверяема:
-- видно, кто с кем работал, где и когда. Пожаловаться на постороннего нельзя.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'no_show' CHECK (kind IN ('no_show')),
  reported_by_telegram_id BIGINT NOT NULL,   -- владелец
  subject_telegram_id BIGINT NOT NULL,       -- фрилансер
  description TEXT,                          -- необязательный текст от владельца
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Один инцидент на смену: повторные нажатия кнопки ничего не плодят.
  UNIQUE (match_id, kind)
);

CREATE INDEX IF NOT EXISTS shift_incidents_open_idx
  ON shift_incidents (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS shift_incidents_subject_idx
  ON shift_incidents (subject_telegram_id);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shift_incidents', 'shift_alerts']
  LOOP
    IF EXISTS (SELECT 1 FROM _pre_existing p WHERE p.t = t) THEN
      RAISE NOTICE 'Таблица % существовала до миграции — RLS не трогаем.', t;
    ELSE
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS pg_temp._pre_existing;
