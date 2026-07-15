-- 004_lockdown_rls.sql
-- Закрыть прямой доступ к таблицам через ПУБЛИЧНЫЙ anon-ключ (PostgREST).
--
-- Проблема (подтверждена на проде 2026-07-15): anon-ключ публичный (лежит в
-- бандле), а разрешающие политики `USING (true)` позволяли читать/менять таблицы
-- напрямую через PostgREST, минуя Telegram-авторизацию в edge-функциях. Проба
-- публичным ключом вернула все ~71 строк из `profiles` (имена, телефоны, города).
--
-- Архитектура: фронтенд НИКОГДА не ходит в таблицы напрямую — всё идёт через
-- edge-функции под service_role (RLS обходит). Значит anon/authenticated не нужен
-- прямой доступ вообще.
--
-- ВАЖНО: схема прода разошлась с миграциями репозитория (в проде `owner_vacancies`,
-- а не `vacancies`, и т.д.). Поэтому лочим по факту — перебираем реально
-- существующие таблицы схемы public, а не хардкодим имена.
--
-- Эффект: на всех таблицах public включается RLS и удаляются все политики →
-- роли anon/authenticated получают отказ по умолчанию. service_role (edge-функции)
-- RLS обходит и продолжает работать без изменений.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1) Включить RLS на каждой базовой таблице public (идемпотентно)
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;

  -- 2) Удалить все существующие политики public (для anon/authenticated их быть
  --    не должно; service_role обходит RLS независимо от политик)
  FOR r IN
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Проверка после применения (должно вернуть 0 строк — политик в public не осталось):
--   SELECT * FROM pg_policies WHERE schemaname = 'public';
-- И прямой запрос публичным anon-ключом к любой таблице должен вернуть [] / 0 строк.
--
-- Если позже понадобится ПУБЛИЧНОЕ чтение (напр. открытая доска вакансий без
-- Telegram) — добавьте точечную политику, напр.:
--   CREATE POLICY "public read open vacancies" ON public.owner_vacancies
--     FOR SELECT TO anon USING (status = 'open');
