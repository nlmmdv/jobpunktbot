# Интеграция Telegram Бота — ПроПункт

Полная система уведомлений для пользователей через Telegram бота.

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Установка](#установка)
3. [Использование](#использование)
4. [События и сообщения](#события-и-сообщения)
5. [Тестирование](#тестирование)

---

## 🏗️ Архитектура

```
┌─────────────────────┐
│   Mini App (React)  │
│  - notifyUser...()  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Supabase Edge Functions            │
│  ├─ handle-bot-events               │
│  │  (обработка событий)             │
│  └─ send-telegram-message           │
│     (отправка в Telegram API)       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Telegram Bot API   │
│  (отправка сообщ)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Пользователь     │
│   (в Telegram)      │
└─────────────────────┘
```

---

## 🔧 Установка

### 1. Создать Telegram бота

```bash
# В Telegram найти @BotFather
/newbot

# Следовать инструкциям:
# - Название: "ПроПункт Бот"
# - Username: "propunkt_bot" или любой другой

# Получишь BOT_TOKEN, например:
# 123456789:ABCdefGHIjklmnoPQRstuvWXYZ
```

### 2. Установить переменные окружения

**.env.example:**
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ
```

**.env (локально):**
```bash
cp .env.example .env
# Отредактировать и добавить:
TELEGRAM_BOT_TOKEN=ваш_токен
```

### 3. Установить secrets в Supabase

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ \
  --project-ref tsicyeumkwvnfkryxfjl
```

### 4. Развернуть Edge Functions

```bash
supabase functions deploy send-telegram-message \
  --project-ref tsicyeumkwvnfkryxfjl

supabase functions deploy handle-bot-events \
  --project-ref tsicyeumkwvnfkryxfjl
```

### 5. Создать таблицу для логов (опционально)

```sql
CREATE TABLE IF NOT EXISTS telegram_message_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  telegram_id BIGINT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  telegram_response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_id ON telegram_message_logs(telegram_id);
```

---

## 💻 Использование

### Импорт функций

```typescript
import {
  notifyUserOnboarding,
  notifyApplicationApproved,
  notifyApplicationRejected,
  notifyRatingChanged,
  notifyNewApplicants,
} from '@/lib/bot-utils';
```

### Примеры использования

#### 1. Отправить приветствие при регистрации

```typescript
// В FreelancerRegScreen.tsx или после регистрации
const handleRegister = async () => {
  // ... регистрация ...
  
  // Отправить приветствие в Telegram
  await notifyUserOnboarding(telegramId);
};
```

#### 2. Уведомить об одобренной заявке

```typescript
// После одобрения заявки владельцем
await notifyApplicationApproved(
  userTelegramId,
  "ИП Петя",           // название компании
  "м. Митино",         // метро
  "09:00",             // время начала
  "22:00",             // время окончания
  1500                 // оплата в рублях
);
```

#### 3. Уведомить об отклоненной заявке

```typescript
await notifyApplicationRejected(
  userTelegramId,
  "ИП Петя"
);
```

#### 4. Уведомить об изменении рейтинга

```typescript
await notifyRatingChanged(
  userTelegramId,
  4.8,                 // новый рейтинг
  4.5,                 // предыдущий рейтинг
  "Отличная работа на смене в м.Митино"
);
```

#### 5. Уведомить владельца о новых откликах

```typescript
await notifyNewApplicants(
  ownerTelegramId,
  "Сортировщик, м.Беговая",  // название вакансии
  5                            // количество откликов
);
```

---

## 📢 События и сообщения

### Типы событий

| Событие | Код | Использование |
|---------|-----|---------------|
| Onboarding | `onboarding` | При первой регистрации |
| Заявка одобрена | `application_approved` | Когда владелец выбрал работника |
| Заявка отклонена | `application_rejected` | Когда владелец отклонил заявку |
| Рейтинг изменился | `rating_changed` | После завершения смены |
| Напоминание о смене | `shift_reminder` | За 2 часа до смены |
| Новые отклики | `new_applicants` | Когда есть отклики на вакансию |

### Формат сообщений

Сообщения отправляются в формате HTML с поддержкой:

```html
<b>Жирный текст</b>
<i>Курсивный текст</i>
<u>Подчёркнутый текст</u>
<code>Моноширинный текст</code>

Эмодзи: 👋 ✅ 🌟 📋 💰 ⏰ 🏢 📍
```

---

## 🧪 Тестирование

### 1. Локальное тестирование

```bash
# Убедись что переменные в .env установлены
TELEGRAM_BOT_TOKEN=твой_токен

# Запусти приложение
npm run dev
```

### 2. Тест через curl

```bash
# Отправить тестовое сообщение
curl -X POST http://localhost:3000/functions/v1/send-telegram-message \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": 123456789,
    "message": "Тестовое сообщение от ПроПункт Бота! ✅"
  }'
```

### 3. Тест события

```bash
curl -X POST http://localhost:3000/functions/v1/handle-bot-events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "onboarding",
    "data": {
      "telegram_id": 123456789
    }
  }'
```

### 4. Как получить свой Telegram ID для тестирования

1. Найти в Telegram бота @userinfobot
2. Написать `/start`
3. Получишь свой ID (обычно большое число вроде 123456789)

---

## 🔐 Безопасность

### Секреты хранятся в Supabase

```bash
# Список секретов
supabase secrets list --project-ref tsicyeumkwvnfkryxfjl

# Обновить секрет
supabase secrets set TELEGRAM_BOT_TOKEN=новый_токен \
  --project-ref tsicyeumkwvnfkryxfjl
```

### Проверка безопасности

- ✅ BOT_TOKEN никогда не попадает в фронтенд
- ✅ Все отправки через Edge Functions
- ✅ Сообщения логируются в БД
- ✅ Telegram ID приватный, не передается в чат

---

## 📊 Мониторинг

### Просмотр логов отправленных сообщений

```sql
SELECT 
  telegram_id,
  message_text,
  sent_at,
  telegram_response
FROM telegram_message_logs
WHERE sent_at > NOW() - INTERVAL '1 day'
ORDER BY sent_at DESC;
```

### Ошибки

Если сообщение не отправилось, проверь:

1. **Токен валиден** — скопируй из @BotFather
2. **Telegram ID верный** — проверь через @userinfobot
3. **Пользователь активировал бота** — нужно нажать /start хотя бы один раз
4. **Интернет соединение** — проверь доступ к Telegram API

---

## 🚀 Что дальше

- [ ] Добавить Webhook для обработки входящих сообщений от пользователей
- [ ] Реализовать inline buttons для быстрых действий
- [ ] Добавить систему напоминаний (через cron jobs)
- [ ] Интегрировать рейтинговую систему с ботом
- [ ] Добавить поддержку multiple языков
