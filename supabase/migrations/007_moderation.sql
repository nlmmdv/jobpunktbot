-- 006_moderation.sql — таблицы модерации
--
-- ⚠️ ПРИМЕНЯТЬ ТОЛЬКО ВРУЧНУЮ через SQL Editor в Supabase.
-- НЕ запускать `supabase db push` / `db pull` против прод-проекта: эта БД общая
-- с большой платформой ПВЗ, её схема и RLS ведутся вне этого репозитория
-- (подробности и история инцидента — в 004_lockdown_rls.sql).
--
-- Поэтому миграция СТРОГО аддитивная:
--   • создаёт только НОВЫЕ таблицы, принадлежащие этому репозиторию;
--   • НЕ трогает profiles / owner_vacancies — ни колонок, ни CHECK-констрейнтов;
--   • RLS включается только на новых таблицах, политик нет => доступ лишь у service_role
--     (Edge Functions), что не влияет на политики общей платформы.
--
-- Блокировка НЕ пишется в profiles.status: этот CHECK-констрейнт принадлежит
-- общей платформе ('active','inactive','banned'). Источник правды о блокировке —
-- таблица moderation_blocks ниже.
--
-- Отдельной таблицы компаний в проде нет: ПВЗ — это профиль с role='owner'.
-- Поэтому subject_id и reported_company_id ссылаются на profiles.id, а
-- subject_type лишь различает, из какого раздела модерации пришло действие.

-- ---------------------------------------------------------------------------
-- ПРЕДОХРАНИТЕЛЬ.
-- Имена `complaints` и `company_complaints` универсальные, и в общей БД такие
-- таблицы могли завестись у платформы. Тогда CREATE TABLE IF NOT EXISTS молча
-- ничего не сделает, а ENABLE ROW LEVEL SECURITY ниже включит RLS на ЧУЖОЙ
-- таблице и отрежет платформе доступ — ровно тот сценарий, что описан в 004.
--
-- Поэтому: если таблица уже есть, но без наших ключевых колонок, миграция
-- аварийно останавливается. RLS включается только на таблицах, которые
-- создала именно эта миграция.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  conflicts text := '';
BEGIN
  IF to_regclass('public.complaints') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'complaints'
         AND column_name = 'reported_user_id'
     )
  THEN
    conflicts := conflicts || ' complaints';
  END IF;

  IF to_regclass('public.company_complaints') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'company_complaints'
         AND column_name = 'reported_company_id'
     )
  THEN
    conflicts := conflicts || ' company_complaints';
  END IF;

  IF conflicts <> '' THEN
    RAISE EXCEPTION
      'Конфликт имён таблиц:%. Эти таблицы уже существуют в общей БД и принадлежат не этому репозиторию. Миграция остановлена, чтобы не включить RLS на чужих данных. Переименуйте наши таблицы (например в pp_complaints / pp_company_complaints) и синхронно поправьте submit-complaint, submit-company-complaint и _shared/moderation.ts.',
      conflicts;
  END IF;
END $$;

-- Запоминаем, какие таблицы существовали ДО миграции: на них RLS не трогаем.
CREATE TEMP TABLE _pre_existing_moderation_tables AS
SELECT unnest(ARRAY[
  'moderation_blocks', 'moderation_warnings',
  'complaints', 'company_complaints', 'moderation_actions'
]) AS name
WHERE false;

INSERT INTO _pre_existing_moderation_tables (name)
SELECT t FROM unnest(ARRAY[
  'moderation_blocks', 'moderation_warnings',
  'complaints', 'company_complaints', 'moderation_actions'
]) AS t
WHERE to_regclass('public.' || t) IS NOT NULL;

-- Блокировки пользователей и компаний (временные и бессрочные)
CREATE TABLE IF NOT EXISTS moderation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'company')),
  subject_id UUID NOT NULL,               -- profiles.id (для 'user' и для 'company')
  subject_telegram_id BIGINT,             -- денормализация: быстрая проверка на входе
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,    -- NULL = бессрочная блокировка
  lifted_at TIMESTAMP WITH TIME ZONE,     -- NULL = блокировка не снята вручную
  created_by UUID,                        -- profiles.id модератора
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_blocks_subject_idx
  ON moderation_blocks (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS moderation_blocks_telegram_idx
  ON moderation_blocks (subject_telegram_id);

-- Предупреждения
CREATE TABLE IF NOT EXISTS moderation_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'company')),
  subject_id UUID NOT NULL,
  subject_telegram_id BIGINT,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_warnings_subject_idx
  ON moderation_warnings (subject_type, subject_id);

-- Жалобы на пользователей. Колонки совпадают с уже задеплоенной submit-complaint.
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL,              -- profiles.id автора жалобы
  reported_user_id UUID NOT NULL,         -- profiles.id нарушителя
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS complaints_reported_user_idx ON complaints (reported_user_id);

-- Жалобы на компании. Колонки совпадают с submit-company-complaint.
CREATE TABLE IF NOT EXISTS company_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL,              -- profiles.id автора жалобы
  reported_company_id UUID NOT NULL,      -- profiles.id владельца ПВЗ
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_complaints_reported_company_idx
  ON company_complaints (reported_company_id);

-- Журнал действий модераторов
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID,
  moderator_telegram_id BIGINT,
  action TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_created_idx
  ON moderation_actions (created_at DESC);

-- Доступ только у service_role: RLS включён, политик нет.
-- Трогаем ТОЛЬКО таблицы, созданные этой миграцией: если таблица существовала
-- раньше, её настройки RLS не наши и меняться не должны.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'moderation_blocks', 'moderation_warnings',
    'complaints', 'company_complaints', 'moderation_actions'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM _pre_existing_moderation_tables p WHERE p.name = t) THEN
      RAISE NOTICE 'Таблица % существовала до миграции — RLS не трогаем.', t;
    ELSE
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- Явно pg_temp: чтобы DROP ни при каких настройках search_path не мог задеть
-- одноимённую постоянную таблицу.
DROP TABLE IF EXISTS pg_temp._pre_existing_moderation_tables;

-- Назначить администратора (роль 'admin' уже разрешена CHECK-констрейнтом profiles):
--   UPDATE profiles SET role = 'admin' WHERE telegram_id = <ваш_telegram_id>;
