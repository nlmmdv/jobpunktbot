-- 009_moderator_grants.sql — назначение модераторов из интерфейса
--
-- ⚠️ ПРИМЕНЯТЬ ТОЛЬКО ВРУЧНУЮ через SQL Editor и в транзакции.
-- НЕ запускать `supabase db push`: база общая с большой платформой ПВЗ.
--
-- Аддитивно: одна новая таблица. profiles не трогаем — роль там уже 'admin',
-- менять констрейнт не требуется.
--
-- Зачем таблица, если роль и так лежит в profiles.role: нужно помнить, КТО кого
-- назначил. На этом строится правило «нельзя снять того, кто выше тебя по
-- цепочке назначений» — иначе назначенный модератор сможет разжаловать того,
-- кто дал ему права.
--
-- previous_role хранит роль до назначения: при отзыве человека надо вернуть
-- владельцем или сотрудником, а не гадать.

DO $$
BEGIN
  IF to_regclass('public.moderator_grants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'moderator_grants'
         AND column_name = 'granted_by'
     )
  THEN
    RAISE EXCEPTION
      'Таблица moderator_grants уже существует и принадлежит не этому репозиторию. Миграция остановлена.';
  END IF;
END $$;

CREATE TEMP TABLE _pre_existing AS
SELECT 'moderator_grants'::text AS t
WHERE to_regclass('public.moderator_grants') IS NOT NULL;

CREATE TABLE IF NOT EXISTS moderator_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,               -- кого назначили
  telegram_id BIGINT NOT NULL,
  granted_by UUID NOT NULL,               -- profiles.id назначившего
  previous_role TEXT NOT NULL,            -- 'owner' | 'employee' — куда вернуть
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID
);

-- Одно действующее назначение на человека: повторно назначить уже
-- действующего модератора нельзя.
CREATE UNIQUE INDEX IF NOT EXISTS moderator_grants_active_idx
  ON moderator_grants (profile_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS moderator_grants_granted_by_idx
  ON moderator_grants (granted_by);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _pre_existing) THEN
    RAISE NOTICE 'Таблица moderator_grants существовала до миграции — RLS не трогаем.';
  ELSE
    ALTER TABLE public.moderator_grants ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP TABLE IF EXISTS pg_temp._pre_existing;

-- Первый модератор назначается здесь и снимается тоже здесь: у него нет записи
-- в moderator_grants, поэтому из интерфейса его разжаловать нельзя.
--   UPDATE profiles SET role = 'admin' WHERE telegram_id = <telegram_id>;
