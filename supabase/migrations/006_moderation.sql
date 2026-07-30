-- 006_moderation.sql — таблицы модерации
--
-- ⚠️ ПРИМЕНЯТЬ ТОЛЬКО ВРУЧНУЮ через SQL Editor в Supabase.
-- НЕ запускать `supabase db push` / `db pull` против прод-проекта: эта БД общая
-- с большой платформой ПВЗ, её схема и RLS ведутся вне этого репозитория
-- (подробности и история инцидента — в 004_lockdown_rls.sql).
--
-- Поэтому миграция СТРОГО аддитивная:
--   • создаёт только НОВЫЕ таблицы, принадлежащие этому репозиторию;
--   • НЕ трогает profiles / owner_profiles / vacancies — ни колонок, ни CHECK-констрейнтов;
--   • RLS включается только на новых таблицах, политик нет => доступ лишь у service_role
--     (Edge Functions), что не влияет на политики общей платформы.
--
-- Блокировка НЕ пишется в owner_profiles.status / profiles.status: их CHECK-констрейнты
-- принадлежат общей платформе ('active','inactive' и 'active','inactive','banned').
-- Источник правды о блокировке — таблица moderation_blocks ниже.

-- Блокировки пользователей и компаний (временные и бессрочные)
CREATE TABLE IF NOT EXISTS moderation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'company')),
  subject_id UUID NOT NULL,               -- profiles.id либо owner_profiles.id
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
  reported_company_id UUID NOT NULL,      -- owner_profiles.id
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
ALTER TABLE moderation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- Назначить администратора (роль 'admin' уже разрешена CHECK-констрейнтом profiles):
--   UPDATE profiles SET role = 'admin' WHERE telegram_id = <ваш_telegram_id>;
