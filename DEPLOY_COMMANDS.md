# Быстрые команды деплоя

## 1️⃣ Применить миграцию БД

```bash
cd /Users/nlmmdv/Desktop/jobpunktbot
supabase db push
```

**Что выполнится:**
- Создаст таблицу `bot_states` с колонками `telegram_id`, `state`, `data`, `created_at`, `updated_at`
- Включит RLS на таблице

**Проверить результат:**
```bash
supabase db list | grep bot_states
```

---

## 2️⃣ Задеплоить Edge Functions

```bash
supabase functions deploy tg-register
supabase functions deploy telegram-webhook
```

**Проверить:**
```bash
supabase functions list
```

Должны быть с зелёной галочкой (deployed) обе функции.

---

## 3️⃣ Настроить команды в BotFather

**Откройте Telegram → @BotFather:**

```
/setcommands

[выберите ваше приложение jobpunktbot]

start - Открыть приложение
feedback - Отправить обратную связь
```

---

## 4️⃣ Проверить переменные окружения

**В Vercel (или .env.local для локальной разработки):**

Должны быть установлены:
- `TELEGRAM_JOBBOT_TOKEN` — токен бота
- `TELEGRAM_WEBHOOK_SECRET` — секрет вебхука
- `SUPABASE_URL` — URL Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — service role ключ

---

## 5️⃣ Тестирование

### Новый пользователь (регистрация)
```
1. Откройте бот
2. /start → заполните регистрацию
3. В админ-группе (-5402800630) появится:

👔 Новый владелец
👤 Ваше Имя Фамилия
📱 +7 999 123-45-67
📍 Ваш город
💬 @your_username
🆔 123456789
📅 21.07.2026, 14:30:45
```

### Обратная связь (feedback)
```
1. Пишите /feedback
2. Бот отвечает: "Напишите ваш отзыв или вопрос..."
3. Пишите: "Кнопка не работает"
4. В админ-группе появится:

💬 Обратная связь
От: Ваше Имя (@your_username)
Роль: Фрилансер
ID: 123456789

Текст: Кнопка не работает

5. Вам в боте: "Спасибо! Мы получили ваше сообщение. 📬"
```

---

## SQL для ручного запроса (если нужна)

Если `supabase db push` не сработает, выполните в Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.bot_states (
  telegram_id bigint PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('waiting_feedback')),
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_states_state ON public.bot_states (state);

ALTER TABLE public.bot_states ENABLE ROW LEVEL SECURITY;
```

---

## Откат в 1 команду

```bash
# Откатить БД на шаг назад
supabase migration down

# Откатить функции
git checkout HEAD~1 supabase/functions/tg-register/index.ts
git checkout HEAD~1 supabase/functions/telegram-webhook/index.ts
supabase functions deploy tg-register
supabase functions deploy telegram-webhook
```

---

## Логирование

Если что-то не работает, смотрите логи функций:

```bash
# Логи tg-register
supabase functions list
# → нажмите на tg-register → Logs

# Или в консоли Vercel
vercel env pull
```

Интересующие логи:
- `Admin notification sent for new user XXX` — регистрация отправилась в админ
- `Bot event handled: onboarding` — онбординг отправился пользователю
- `Error handling Telegram update:` — что-то пошло не так в webhook

---

## Финальный чек

```bash
# 1. Миграция применена?
supabase db pull  # должна быть таблица bot_states

# 2. Функции задеплоены?
supabase functions list

# 3. Переменные установлены?
vercel env pull
grep TELEGRAM .env.local

# 4. Тест в боте — /feedback работает?
# (устройство/тестовый аккаунт в Telegram)
```

Готово! 🎉
