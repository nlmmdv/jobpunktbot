# 🧪 Тестирование Telegram Бота

Несколько способов протестировать бота БЕЗ создания реального бота.

---

## **1️⃣ Mock версия (рекомендуется) — самый быстрый**

### Использование в компонентах

```typescript
// Вместо реального бота используем mock
import { 
  notifyApplicationApproved,
  getMessageLog,
  printMessageStats 
} from '@/lib/bot-utils.mock';

// Отправить сообщение (логирует в консоль)
await notifyApplicationApproved(
  123456789,
  "ИП Петя",
  "м. Митино",
  "09:00",
  "22:00",
  1500
);

// Посмотреть все логированные сообщения
console.log(getMessageLog());

// Вывести статистику
printMessageStats();
```

### Результат в консоли

```
📨 Bot Message: application_approved
👤 Telegram ID: 123456789
📝 Message:
✅ Отлично!

Твоя заявка принята:
🏢 ИП Петя
📍 м. Митино
⏰ 09:00 — 22:00
💰 1500 ₽/день

Контакт работодателя скоро свяжется с тобой.
Не забудь дать обратную связь после смены!
⏰ Time: 2025-07-16T12:00:00.000Z
```

### Плюсы
- ✅ Работает без Telegram бота
- ✅ Быстро смотреть результаты в консоли
- ✅ Можно добавить в компоненты React
- ✅ Отлично для разработки

---

## **2️⃣ Тестирование через Postman/curl**

### Тест `send-telegram-message` локально

```bash
# 1. Запустить функцию локально
supabase functions serve

# 2. В другом терминале отправить запрос
curl -X POST http://localhost:54321/functions/v1/send-telegram-message \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": 123456789,
    "message": "Тестовое сообщение от ПроПункт! ✅"
  }'
```

### Ожидаемый ответ

```json
{
  "success": true,
  "result": {
    "ok": false,
    "error_code": 401,
    "description": "Bot token was not provided"
  }
}
```

**Это нормально** — токен не установлен в .env, но функция работает!

---

## **3️⃣ Полный сценарий тестирования**

### Файл: `src/__tests__/bot-utils.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  notifyApplicationApproved,
  notifyApplicationRejected,
  notifyRatingChanged,
  getMessageLog,
  clearMessageLog,
} from '@/lib/bot-utils.mock';

describe('Bot Utils - Mock', () => {
  beforeEach(() => {
    clearMessageLog();
  });

  afterEach(() => {
    clearMessageLog();
  });

  it('should log application approved message', async () => {
    const telegramId = 123456789;
    
    await notifyApplicationApproved(
      telegramId,
      'ИП Петя',
      'м. Митино',
      '09:00',
      '22:00',
      1500
    );

    const logs = getMessageLog();
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('application_approved');
    expect(logs[0].telegramId).toBe(telegramId);
    expect(logs[0].message).toContain('ИП Петя');
  });

  it('should log rating increased message', async () => {
    const telegramId = 123456789;
    
    await notifyRatingChanged(
      telegramId,
      4.8,
      4.5,
      'Отличная работа на смене'
    );

    const logs = getMessageLog();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain('🌟');
    expect(logs[0].message).toContain('4.8');
  });

  it('should log multiple messages correctly', async () => {
    await notifyApplicationApproved(123456789, 'ИП 1', 'м. А', '09:00', '18:00', 1000);
    await notifyApplicationApproved(987654321, 'ИП 2', 'м. Б', '10:00', '20:00', 1500);
    
    const logs = getMessageLog();
    expect(logs).toHaveLength(2);
    expect(logs[0].telegramId).toBe(123456789);
    expect(logs[1].telegramId).toBe(987654321);
  });
});
```

### Запустить тесты

```bash
npm run test
```

---

## **4️⃣ Интерактивное тестирование в браузере**

### Добавить кнопки в DevTools

```typescript
// Добавить в useEffect компонента для тестирования
useEffect(() => {
  // Выставить функции в window для консоли
  if (process.env.NODE_ENV === 'development') {
    window.testBot = {
      onboarding: () => import('@/lib/bot-utils.mock').then(m => m.notifyUserOnboarding(123456789)),
      approved: () => import('@/lib/bot-utils.mock').then(m => 
        m.notifyApplicationApproved(123456789, 'ИП Петя', 'м. Митино', '09:00', '22:00', 1500)
      ),
      rejected: () => import('@/lib/bot-utils.mock').then(m => 
        m.notifyApplicationRejected(123456789, 'ИП Петя')
      ),
      ratingUp: () => import('@/lib/bot-utils.mock').then(m => 
        m.notifyRatingChanged(123456789, 4.8, 4.5, 'Отличная работа')
      ),
      getLogs: () => {
        const m = require('@/lib/bot-utils.mock');
        console.table(m.getMessageLog());
      },
      clearLogs: () => import('@/lib/bot-utils.mock').then(m => m.clearMessageLog()),
    };
  }
}, []);
```

### В консоли браузера

```javascript
// Вызвать любую функцию
await testBot.onboarding();
await testBot.approved();
await testBot.ratingUp();

// Посмотреть все сообщения
testBot.getLogs();

// Очистить лог
testBot.clearLogs();
```

---

## **5️⃣ Тестирование конкретных сценариев**

### Сценарий: Новый пользователь регистрируется

```typescript
// 1. Пользователь регистрируется
await notifyUserOnboarding(123456789);

// 2. Создает первую заявку
// ... (код в приложении)

// 3. Заявка одобрена
await notifyApplicationApproved(
  123456789,
  "ИП Петя",
  "м. Митино",
  "09:00",
  "22:00",
  1500
);

// 4. Смена завершена, рейтинг вырос
await notifyRatingChanged(
  123456789,
  4.8,
  4.5,
  "Отличная работа на смене в м.Митино"
);

// Проверить все сообщения
console.table(getMessageLog());
```

### Результат

```
┌─────────┬────────────────────────────┬──────────────┬──────────────────┐
│ (index) │ timestamp                  │ type         │ telegramId       │
├─────────┼────────────────────────────┼──────────────┼──────────────────┤
│ 0       │ 2025-07-16T12:00:00.000Z   │ onboarding   │ 123456789        │
│ 1       │ 2025-07-16T12:00:01.000Z   │ application… │ 123456789        │
│ 2       │ 2025-07-16T12:00:02.000Z   │ rating_chan… │ 123456789        │
└─────────┴────────────────────────────┴──────────────┴──────────────────┘
```

---

## **6️⃣ Когда включить реального бота?**

### Готово к реальному боту когда:
- ✅ Все функции логируют правильные сообщения
- ✅ Текст сообщений хороший
- ✅ Тесты проходят
- ✅ Нет багов в логике

### Как переключиться:

**Вариант 1: Условный импорт**
```typescript
// bot-utils.ts
const isMock = process.env.VITE_USE_BOT_MOCK === 'true';

export const notifyApplicationApproved = isMock
  ? mockFunctions.notifyApplicationApproved
  : realFunctions.notifyApplicationApproved;
```

**Вариант 2: Полная замена**
```typescript
// В .env
VITE_USE_BOT_MOCK=true  // для разработки

// В коде
import * as botUtils from process.env.VITE_USE_BOT_MOCK 
  ? '@/lib/bot-utils.mock' 
  : '@/lib/bot-utils';
```

---

## 📊 Чек-лист тестирования

- [ ] Mock версия логирует все типы сообщений
- [ ] Сообщения содержат правильные данные
- [ ] Консоль читаемая и понятная
- [ ] Можно быстро проверить каждый сценарий
- [ ] Все 6 типов событий работают
- [ ] Тесты (если написаны) зелёные ✅

---

## 🚀 Что дальше

1. Используй mock для разработки
2. Когда будешь готов — получи BOT_TOKEN от @BotFather
3. Установи токен в Supabase secrets
4. Переключись на реальный бот
5. Тестируй в реальном Telegram
