# Новые функционалы Telegram бота

## 1️⃣ Уведомления о новых пользователях в админ-группу

### Описание
После успешной регистрации профиля в Edge Function `tg-register` отправляется сообщение в админ-группу с информацией о новом пользователе.

### Что отправляется
```
👔 Новый владелец              (или 🆕 Новый фрилансер)
👤 Иван Петров                 (first_name last_name)
📱 +7 999 123-45-67            (phone)
📍 Москва                        (city, если указан)
💬 @ivanov                       (telegram_username или "нет username")
🆔 123456789                     (telegram_id)
📅 21.07.2026, 14:30:45        (дата/время по московскому времени)
```

### Константа
```typescript
const ADMIN_CHAT_ID = -5402800630;
```

### Реализация
Файл: `supabase/functions/tg-register/index.ts`

Функция `notifyAdminNewUser()` отправляет напрямую в Telegram API:
- Формирует текст с информацией о пользователе
- Экранирует спецсимволы для безопасности
- Отправляет через `https://api.telegram.org/bot{TOKEN}/sendMessage`
- Не влияет на результат регистрации (ошибки логируются, но не падают)

---

## 2️⃣ Кнопка "Обратная связь" в боте

### Описание
Реализована система обратной связи в Telegram боте:
1. Пользователь отправляет `/feedback`
2. Бот просит написать отзыв
3. Пользователь пишет текст
4. Сообщение (с информацией о пользователе) уходит в админ-группу
5. Пользователю приходит подтверждение

### Что происходит

#### A) Команда `/feedback`
```
Пользователь: /feedback
Бот: "Напишите ваш отзыв или вопрос. Мы обязательно прочитаем. 📝"
```

Действия:
- Сохраняется состояние `waiting_feedback` в таблице `bot_states`
- Следующее текстовое сообщение будет обработано как обратная связь

#### B) Пользователь пишет отзыв
```
Пользователь: "не работает кнопка откликнуться на вакансию"
```

Действия в админ-группе:
```
💬 Обратная связь
От: Иван Петров (@ivanov)
Роль: Фрилансер
ID: 123456789

Текст: не работает кнопка откликнуться на вакансию
```

Ответ пользователю:
```
Спасибо! Мы получили ваше сообщение. 📬
```

### Состояние диалога
Хранится в новой таблице `bot_states`:
```sql
telegram_id bigint PRIMARY KEY       -- кто
state text                           -- 'waiting_feedback'
data jsonb                           -- доп. данные (например, initiated_at)
created_at timestamptz               -- когда создано
updated_at timestamptz               -- когда обновлено
```

### Приоритет команд
1. `/start` — всегда открывает главное меню
2. `/feedback` — начинает режим ввода обратной связи
3. Текст с ожидающей обратной связью → отправляется в админ
4. Текст после низкой оценки → комментарий к рейтингу
5. Обычный текст → игнорируется (если нет активного состояния)

### Реализация
Файл: `supabase/functions/telegram-webhook/index.ts`

Функции:
- `handleFeedbackStart()` — обработка `/feedback`, сохранение состояния
- `handleFeedback()` — обработка текста в режиме обратной связи
- `sendAdminMessage()` — отправка сообщения в админ-группу

---

## 📊 Таблица `bot_states`

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

**Политики RLS:** Нет (только edge-функции под service_role имеют доступ)

---

## 🚀 Деплой

### 1. Применить миграцию БД
```bash
cd /Users/nlmmdv/Desktop/jobpunktbot

# Проверить миграции
supabase migration list

# Применить новую миграцию 006_bot_states.sql
supabase db push
```

### 2. Задеплоить Edge Functions
```bash
supabase functions deploy tg-register
supabase functions deploy telegram-webhook
```

### 3. Настроить меню бота в BotFather

Откройте Telegram, напишите @BotFather:

```
/setcommands

[выберите бота]

start - Открыть приложение
feedback - Отправить обратную связь
```

### 4. Проверить переменные окружения

```bash
# .env.local или в Vercel:
TELEGRAM_JOBBOT_TOKEN=<ваш токен>
TELEGRAM_WEBHOOK_SECRET=<ваш секрет>
SUPABASE_URL=<https://...>
SUPABASE_SERVICE_ROLE_KEY=<sk_...>
```

---

## ✅ Чек-лист после деплоя

- [ ] Миграция БД применена (`supabase db push` — никаких ошибок)
- [ ] Edge Functions задеплоены без ошибок
- [ ] Переменные окружения установлены в Vercel
- [ ] В BotFather добавлены команды /start и /feedback
- [ ] Тестовая регистрация → появилось сообщение в админ-группе
- [ ] `/feedback` → "Напишите ваш отзыв..."
- [ ] Текст отзыва → уходит в админ-группу и в боте "Спасибо!"

---

## 🐛 Откат (если потребуется)

### Откатить БД
```bash
supabase migration down
```

### Откатить функции
```bash
git checkout HEAD~1 supabase/functions/tg-register/index.ts
git checkout HEAD~1 supabase/functions/telegram-webhook/index.ts

supabase functions deploy tg-register
supabase functions deploy telegram-webhook
```

### Удалить команды в BotFather
```
/setcommands
[выберите бота]
(оставить пусто или удалить /feedback)
```

---

## 📝 Файлы, которые изменились

### Новые файлы
- `supabase/migrations/006_bot_states.sql` — миграция БД
- `DEPLOY.md` — инструкции деплоя
- `BOT_FEATURES.md` — этот файл

### Изменённые файлы
- `supabase/functions/tg-register/index.ts` — добавлена функция `notifyAdminNewUser()`
- `supabase/functions/telegram-webhook/index.ts` — добавлены функции для обратной связи

---

## 🔒 Безопасность

- **Экранирование:** все значения от пользователей проходят через `esc()` для HTML-режима
- **Лимит текста:** обратная связь обрезается до `TEXT_LIMITS.comment` (обычно 500 символов)
- **RLS:** таблица `bot_states` защищена RLS, клиент не может обращаться напрямую
- **Токен:** используется переменная окружения `TELEGRAM_JOBBOT_TOKEN`, нигде не захардкодена
- **Админ-группа:** ID захардкодена, но это внутренний ID (начинается с минуса), не может быть угадана

---

## 📞 Контакты

Вопросы о деплое:
- Проверить логи: `supabase functions list` → выбрать функцию → Logs
- Проверить БД: `supabase db --help`
- Telegram API: https://core.telegram.org/bots/api
