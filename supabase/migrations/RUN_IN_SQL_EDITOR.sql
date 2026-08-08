-- Модерация: блокировки, неявки, назначение модераторов.
-- Аддитивно: только новые таблицы, ничего существующего не меняется.
BEGIN;

-- Предохранитель: если имя занято чужой таблицей — останавливаемся, чтобы не
-- включить RLS на данных платформы.
DO $$
DECLARE
  conflicts text := '';
  checks text[][] := ARRAY[
    ARRAY['moderation_blocks',  'subject_telegram_id'],
    ARRAY['moderation_actions', 'moderator_telegram_id'],
    ARRAY['shift_incidents',    'match_id'],
    ARRAY['shift_alerts',       'alert_kind'],
    ARRAY['moderator_grants',   'granted_by']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(checks, 1) LOOP
    IF to_regclass('public.' || checks[i][1]) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = checks[i][1]
           AND column_name = checks[i][2]
       )
    THEN
      conflicts := conflicts || ' ' || checks[i][1];
    END IF;
  END LOOP;

  IF conflicts <> '' THEN
    RAISE EXCEPTION 'Конфликт имён таблиц:%. Они принадлежат не этому проекту. Ничего не создано.', conflicts;
  END IF;
END $$;

-- Какие таблицы существовали до запуска: на них RLS не трогаем.
CREATE TEMP TABLE _pre AS
SELECT t FROM unnest(ARRAY[
  'moderation_blocks','moderation_actions','shift_incidents','shift_alerts','moderator_grants'
]) AS t
WHERE to_regclass('public.' || t) IS NOT NULL;

-- ── Блокировки аккаунтов ─────────────────────────────────────────────────────
-- expires_at NULL = бессрочно, lifted_at NULL = не снята вручную.
CREATE TABLE IF NOT EXISTS moderation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  subject_telegram_id BIGINT NOT NULL,
  subject_role TEXT,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_blocks_subject_idx ON moderation_blocks (subject_id);
CREATE INDEX IF NOT EXISTS moderation_blocks_active_idx
  ON moderation_blocks (subject_telegram_id) WHERE lifted_at IS NULL;

-- ── Журнал действий модераторов ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL,
  moderator_telegram_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  subject_id UUID,
  subject_telegram_id BIGINT,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_actions_created_idx ON moderation_actions (created_at DESC);

-- ── Неявки на смену ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'no_show' CHECK (kind IN ('no_show')),
  reported_by_telegram_id BIGINT NOT NULL,
  subject_telegram_id BIGINT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, kind)
);
CREATE INDEX IF NOT EXISTS shift_incidents_open_idx
  ON shift_incidents (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS shift_incidents_subject_idx ON shift_incidents (subject_telegram_id);

-- ── Отметки об отправленных сигналах (защита от повторов) ────────────────────
CREATE TABLE IF NOT EXISTS shift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  alert_kind TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, alert_kind)
);

-- ── Кто кого назначил модератором ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderator_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  granted_by UUID NOT NULL,
  previous_role TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID
);
CREATE UNIQUE INDEX IF NOT EXISTS moderator_grants_active_idx
  ON moderator_grants (profile_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS moderator_grants_granted_by_idx ON moderator_grants (granted_by);

-- ── RLS только на созданном сейчас ───────────────────────────────────────────
-- Политик нет: доступ лишь у service_role, то есть у edge-функций.
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'moderation_blocks','moderation_actions','shift_incidents','shift_alerts','moderator_grants'
  ] LOOP
    IF EXISTS (SELECT 1 FROM _pre p WHERE p.t = tbl) THEN
      RAISE NOTICE 'Таблица % существовала раньше — RLS не трогаем.', tbl;
    ELSE
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS pg_temp._pre;

-- Проверка: должно быть 5 строк, у всех rls = true
SELECT tablename, rowsecurity AS rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('moderation_blocks','moderation_actions','shift_incidents','shift_alerts','moderator_grants')
ORDER BY tablename;

COMMIT;
