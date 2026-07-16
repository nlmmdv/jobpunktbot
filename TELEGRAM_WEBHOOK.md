# 🤖 Telegram Webhook — Настройка

Инструкция по настройке webhook для получения обновлений от Telegram бота.

---

## 📋 Что такое Webhook?

**Webhook** = Telegram сам отправляет события на твой сервер (вместо того чтобы ты постоянно спрашивал "есть ли что-то новое?")

```
Пользователь пишет боту → Telegram → POST на твой webhook → обработка
```

---

## 🔐 Безопасность

Webhook должен быть защищен секретом чтобы:
- ✅ Только Telegram мог отправлять апдейты
- ✅ Никто не мог отправить фейковые события

**Как работает:**
1. Ты устанавливаешь webhook с `X-Telegram-Bot-Api-Secret-Token`
2. Telegram подписывает каждый апдейт этим секретом
3. Твой сервер проверяет подпись перед обработкой

---

## 🚀 Установка

### 1. Создать webhook secret

```bash
# Генерируем случайный секрет (32 символа)
openssl rand -hex 16
# Результат: a1b2c3d4e5f6g7h8...

# Или используй свой
export TELEGRAM_WEBHOOK_SECRET="твой_секрет_32_символа"
```

### 2. Установить в Supabase

```bash
supabase secrets set TELEGRAM_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8... \
  --project-ref tsicyeumkwvnfkryxfjl
```

### 3. Развернуть функцию

```bash
supabase functions deploy telegram-webhook \
  --project-ref tsicyeumkwvnfkryxfjl
```

### 4. Установить webhook через API Telegram

```bash
# Переменные
BOT_TOKEN="твой_бот_токен"
WEBHOOK_SECRET="a1b2c3d4e5f6g7h8..."
WEBHOOK_URL="https://tsicyeumkwvnfkryxfjl.supabase.co/functions/v1/telegram-webhook"

# Установить webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${WEBHOOK_SECRET}\",
    \"max_connections\": 40,
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"
```

### 5. Проверить что webhook работает

```bash
curl -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

**Должны увидеть:**
```json
{
  "ok": true,
  "result": {
    "url": "https://tsicyeumkwvnfkryxfjl.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "...",
    "last_error_date": 0
  }
}
```

---

## 📞 Команды которые работают

- `/start` — приветствие и инструкция
- `/help` — справка и FAQ
- `/support` — контакты поддержки
- `/app` — ссылка на приложение

---

## 🔄 Как работает функция

```typescript
// telegram-webhook/index.ts

1. Получает апдейт от Telegram
2. Проверяет X-Telegram-Bot-Api-Secret-Token
3. Парсит обновление (message или callback_query)
4. Отправляет ответ через send-telegram-message
5. Возвращает 200 OK Telegram
```

**Важно:** Даже если произойдет ошибка, возвращаем 200 чтобы Telegram не пересылал апдейт.

---

## 📚 Структура файлов

```
supabase/functions/
├── telegram-webhook/
│   └── index.ts (обработка апдейтов)
├── _shared/
│   ├── bot-messages.ts (шаблоны сообщений)
│   ├── internal-auth.ts (проверка secret)
│   ├── cors.ts (CORS headers)
│   └── telegram-auth.ts (проверка initData)
└── send-telegram-message/
    └── index.ts (отправка сообщений)
```

---

## 🔌 Интеграция с приложением

Когда пользователь:
1. Запускает бота в Telegram → `/start` → приветствие + ссылка на приложение
2. Создаёт резюме → приложение уведомляет Telegram бота через `notifyUserOnboarding()`
3. Получает отклик → бот шлёт уведомление через `notifyApplicationApproved()`

**Два канала общения:**
- 📱 **Mini App** — основной интерфейс (обновления, откклики, профиль)
- 🤖 **Telegram Bot** — уведомления и быстрые команды

---

## 🧪 Тестирование локально

### Без webhook (polling)

Если хочешь тестировать локально без webhook:

```bash
# Удалить webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"

# Использовать polling (polling-bot.ts)
# Бот будет сам спрашивать "есть ли что-то новое?" каждую секунду
```

### С mock webhook

```bash
# Локально запустить функцию
supabase functions serve telegram-webhook

# Отправить тестовый апдейт
curl -X POST http://localhost:54321/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: твой_secret" \
  -d '{
    "update_id": 123,
    "message": {
      "message_id": 1,
      "from": {"id": 123456789, "first_name": "Test", "is_bot": false},
      "chat": {"id": 123456789, "type": "private"},
      "date": 1234567890,
      "text": "/start"
    }
  }'
```

---

## 🐛 Troubleshooting

### Webhook не получает апдейты

```bash
# Проверь статус
curl -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

# Если есть pending_update_count > 0 — апдейты ждут
# Если есть last_error — посмотри error_message

# Обновить webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${WEBHOOK_URL}"
```

### Ошибка "Unauthorized"

- Проверь что `TELEGRAM_WEBHOOK_SECRET` установлен в Supabase
- Проверь что `X-Telegram-Bot-Api-Secret-Token` совпадает с тем что ты установил

### Функция не деплоится

```bash
# Проверить логи
supabase functions list --project-ref tsicyeumkwvnfkryxfjl

# Посмотреть детали ошибки
supabase functions deploy telegram-webhook \
  --project-ref tsicyeumkwvnfkryxfjl --verbose
```

---

## 📞 Что дальше?

- [ ] Добавить обработку inline buttons (callback_query)
- [ ] Логировать все апдейты в БД для аналитики
- [ ] Добавить rate limiting
- [ ] Интегрировать с системой уведомлений приложения

---

## 🔗 Полезные ссылки

- [Telegram Bot API docs](https://core.telegram.org/bots/api#setwebhook)
- [Webhook vs Polling](https://core.telegram.org/bots/faq#how-do-i-handle-a-change-of-my-bot-s-username)
- [Secret Token verification](https://core.telegram.org/bots/api#setwebhook)
