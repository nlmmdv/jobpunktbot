-- 005_ratings_and_shift_notifications.sql
-- Уведомления о сменах и рейтинги.
--
-- База общая с платформой, поэтому здесь ТОЛЬКО добавления: три колонки и две
-- новые таблицы. Ничего существующего не изменяется и не удаляется.

-- ── job_matches: состояние смены ────────────────────────────────────────────
-- confirmed_at      — когда фрилансер подтвердил выход (NULL = не подтвердил)
-- notification_sent — напоминание за час уже отправлено (чтобы не слать дважды)
-- rating_sent       — запрос оценки после смены уже отправлен
ALTER TABLE public.job_matches
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_sent boolean NOT NULL DEFAULT false;

-- Крон каждые 10 минут ищет смены, которым пора слать уведомление.
CREATE INDEX IF NOT EXISTS idx_job_matches_pending_notification
  ON public.job_matches (status, notification_sent, rating_sent);

-- ── ratings: оценки за смену ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.job_matches(id) ON DELETE CASCADE,
  from_telegram_id bigint NOT NULL,
  to_telegram_id bigint NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Одну смену один человек оценивает один раз: защита от повторных нажатий
  -- на те же кнопки (сообщение с ними остаётся в чате навсегда).
  UNIQUE (match_id, from_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_to_telegram_id ON public.ratings (to_telegram_id);

-- ── pending_ratings: ждём комментарий после низкой оценки ───────────────────
-- Строка живёт от нажатия «⭐1..3» до текстового ответа. PRIMARY KEY по
-- telegram_id: одновременно у человека может висеть только один незакрытый
-- комментарий, новая низкая оценка вытесняет старую (UPSERT).
CREATE TABLE IF NOT EXISTS public.pending_ratings (
  telegram_id bigint PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.job_matches(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  role text NOT NULL CHECK (role IN ('freelancer', 'owner')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- В обе таблицы ходят только edge-функции под service_role (он RLS обходит).
-- Клиент туда не обращается, а anon-ключ публичный — поэтому включаем RLS и не
-- заводим ни одной политики: так anon не прочитает ни оценок, ни комментариев.
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_ratings ENABLE ROW LEVEL SECURITY;
