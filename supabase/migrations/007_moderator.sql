-- 007_moderator.sql — блокировки аккаунтов и журнал действий модератора
--
-- ⚠️ ПРИМЕНЯТЬ ТОЛЬКО ВРУЧНУЮ через SQL Editor и в транзакции.
-- НЕ запускать `supabase db push`: база общая с большой платформой ПВЗ, её схема
-- ведётся вне этого репозитория (история инцидента — в 004_lockdown_rls.sql).
--
-- Миграция строго аддитивная: создаёт только новые таблицы и не трогает ни одной
-- существующей — ни колонок, ни CHECK-констрейнтов.
--
-- Блокировка НЕ пишется в profiles.status: этот констрейнт принадлежит общей
-- платформе. Источник правды — moderation_blocks, он же даёт срок действия и
-- снятие вручную, чего флаг в status не умеет.
--
-- Роль модератора — существующая 'admin' (она уже разрешена констрейнтом
-- profiles.role). Отдельное значение 'moderator' потребовало бы ALTER чужой
-- таблицы, поэтому в БД роль называется 'admin', а в интерфейсе — «Модератор».

-- ---------------------------------------------------------------------------
-- ПРЕДОХРАНИТЕЛЬ: имена могли быть заняты платформой. Если таблица уже есть, но
-- без наших ключевых колонок — останавливаемся, чтобы не включить RLS на чужих
-- данных и не отрезать платформе доступ.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  conflicts text := '';
BEGIN
  IF to_regclass('public.moderation_blocks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'moderation_blocks'
         AND column_name = 'subject_telegram_id'
     )
  THEN
    conflicts := conflicts || ' moderation_blocks';
  END IF;

  IF to_regclass('public.moderation_actions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'moderation_actions'
         AND column_name = 'moderator_telegram_id'
     )
  THEN
    conflicts := conflicts || ' moderation_actions';
  END IF;

  IF conflicts <> '' THEN
    RAISE EXCEPTION
      'Конфликт имён таблиц:%. Они уже существуют в общей БД и принадлежат не этому репозиторию. Миграция остановлена. Переименуйте наши таблицы и синхронно поправьте supabase/functions/_shared/moderation.ts.',
      conflicts;
  END IF;
END $$;

-- Какие из наших таблиц существовали ДО миграции: на них RLS не трогаем.
CREATE TEMP TABLE _pre_existing AS
SELECT t FROM unnest(ARRAY['moderation_blocks', 'moderation_actions']) AS t
WHERE to_regclass('public.' || t) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Блокировки аккаунтов: и владельцев, и фрилансеров.
-- expires_at NULL = бессрочно; иначе блокировка гаснет сама.
-- lifted_at    NULL = не снята вручную.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,               -- profiles.id заблокированного
  subject_telegram_id BIGINT NOT NULL,    -- быстрая проверка на входе
  subject_role TEXT,                      -- 'owner' | 'employee' на момент блокировки
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID,
  created_by UUID NOT NULL,               -- profiles.id модератора
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_blocks_subject_idx
  ON moderation_blocks (subject_id);
-- Проверка на входе идёт по telegram_id и только среди действующих блокировок.
CREATE INDEX IF NOT EXISTS moderation_blocks_active_idx
  ON moderation_blocks (subject_telegram_id) WHERE lifted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Журнал действий модератора. При полном контроле обязателен: один человек
-- может заблокировать, снять штраф и аннулировать оценку — нужна запись, кто и
-- зачем. В details лежит снимок удалённой строки, чтобы решение можно было
-- разобрать и откатить вручную.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL,
  moderator_telegram_id BIGINT NOT NULL,
  action TEXT NOT NULL,                   -- block | unblock | cancel_penalty | delete_rating | cancel_shift
  subject_id UUID,
  subject_telegram_id BIGINT,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_created_idx
  ON moderation_actions (created_at DESC);

-- Доступ только у service_role: RLS включаем ТОЛЬКО на созданном этой миграцией.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['moderation_blocks', 'moderation_actions']
  LOOP
    IF EXISTS (SELECT 1 FROM _pre_existing p WHERE p.t = t) THEN
      RAISE NOTICE 'Таблица % существовала до миграции — RLS не трогаем.', t;
    ELSE
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS pg_temp._pre_existing;

-- Назначить модератора (роль 'admin' уже разрешена констрейнтом profiles.role):
--   UPDATE profiles SET role = 'admin' WHERE telegram_id = <telegram_id>;
