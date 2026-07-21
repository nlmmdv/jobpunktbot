# Деплой новых функционалов Telegram бота

## 1. Уведомления о новых пользователях в группу

### Что добавилось:
- **tg-register** отправляет сообщение в админ-группу после успешной регистрации
- Формат сообщения: роль, имя, телефон, город, username, ID, дата/время

### Константа:
```
ADMIN_CHAT_ID = -5402800630
```

## 2. Обратная связь (Feedback)

### Что добавилось:
- Команда `/feedback` в боте
- Сохранение состояния диалога в таблице `bot_states`
- Пользователь пишет отзыв → сообщение уходит в админ-группу
- Следующее текстовое сообщение от пользователя обрабатывается как обратная связь (если он в состоянии `waiting_feedback`)

### Таблица `bot_states`:
```sql
CREATE TABLE IF NOT EXISTS public.bot_states (
  telegram_id bigint PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('waiting_feedback')),
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Инструкции деплоя

### Шаг 1: Применить миграцию БД
```bash
supabase migration up
```

Или вручную выполнить SQL из файла:
```bash
supabase db push
```

### Шаг 2: Убедиться, что переменные окружения установлены
```bash
# .env или в Vercel
TELEGRAM_JOBBOT_TOKEN=<ваш токен>
TELEGRAM_WEBHOOK_SECRET=<ваш секрет>
SUPABASE_URL=<URL>
SUPABASE_SERVICE_ROLE_KEY=<ключ>
```

### Шаг 3: Задеплоить Edge Functions
```bash
supabase functions deploy tg-register
supabase functions deploy telegram-webhook
```

### Шаг 4: Настроить команду /feedback в BotFather
1. Откройте Telegram и напишите @BotFather
2. Отправьте `/setcommands`
3. Выберите вашего бота
4. Отправьте список команд:
```
start - Открыть приложение
feedback - Отправить обратную связь
```

---

## Тестирование

### Новый пользователь:
1. Откройте бот
2. Нажмите /start → заполните регистрацию
3. После успешной регистрации в админ-группе (-5402800630) появится сообщение

### Обратная связь:
1. Отправьте боту `/feedback`
2. Бот ответит: "Напишите ваш отзыв или вопрос..."
3. Напишите отзыв
4. Сообщение уходит в админ-группу, пользователю — "Спасибо! Мы получили ваше сообщение."

---

## Форматы сообщений

### Новый пользователь (в админ-группе):
```
👔 Новый владелец
👤 Иван Петров
📱 +7 999 123-45-67
📍 Москва
💬 @ivanov
🆔 123456789
📅 21.07.2026, 14:30:45
```

### Обратная связь (в админ-группе):
```
💬 Обратная связь
От: Иван Петров (@ivanov)
Роль: Фрилансер
ID: 123456789

Текст: не работает кнопка откликнуться на вакансию
```

---

## Откат

Если что-то пошло не так:

```bash
# Откатить миграцию БД
supabase migration down

# Откатить функции к старой версии
git checkout HEAD~1 supabase/functions/tg-register/index.ts
git checkout HEAD~1 supabase/functions/telegram-webhook/index.ts
supabase functions deploy tg-register
supabase functions deploy telegram-webhook
```
