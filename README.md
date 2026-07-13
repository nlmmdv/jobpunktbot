# ПроПункт - Telegram Mini App для биржи труда ПВЗ

Telegram Mini App для управления работниками и заказами на ПВЗ (пункты выдачи).

## Структура проекта

```
src/
├── lib/
│   ├── supabase.ts          # Supabase клиент с Punktir Pro credentials
│   └── telegram.ts          # Telegram WebApp SDK wrapper
├── contexts/
│   └── AuthContext.tsx      # Управление авторизацией и ролями
├── screens/
│   ├── RegistrationScreen.tsx    # Экран регистрации (заглушка)
│   ├── FreelancerMainScreen.tsx  # Главный экран фрилансера
│   └── OwnerMainScreen.tsx       # Главный экран владельца ПВЗ
├── App.tsx                  # Роутинг между экранами
└── main.tsx                 # Entry point с AuthProvider
```

## Как работает авторизация

1. **На запуске** приложение получает Telegram user из `WebApp.initDataUnsafe.user`
2. **Поиск профиля** в таблице `profiles` по `telegram_id`
3. **Если профиля нет** → показать экран регистрации
4. **Если профиль найден** → загрузить данные и определить роль:
   - `owner` или `admin` → режим владельца ПВЗ
   - `freelancer` → режим фрилансера

## Технологии

- **React 18** + TypeScript
- **Vite** - сборка
- **Tailwind CSS** - стили
- **Supabase** - бэкенд (API + БД)
- **Telegram WebApp SDK** - интеграция с Telegram
- **@twa-dev/sdk** - TypeScript типы для SDK

## Стили и тема

- **Тёмная тема** по умолчанию
- **CSS переменные Telegram**: автоматически подхватываются из `--tg-theme-*`
- **Акцент**: фиолетовый `#6D28D9`
- **Tailwind утилиты**: `bg-tg-bg`, `text-tg-text`, `text-tg-hint` и т.д.

## Развёртывание

### Локально

```bash
npm install
npm run dev
```

### На production

```bash
npm run build
# Залить содержимое /dist на веб-сервер
# Настроить URL в Telegram Bot API
```

## Следующие шаги

1. **Реализовать RegistrationScreen**:
   - Форма с именем, контактами, выбором роли
   - Сохранение нового профиля в БД

2. **Наполнить FreelancerMainScreen**:
   - Список доступных заказов
   - Профиль фрилансера
   - История выполненных заказов

3. **Наполнить OwnerMainScreen**:
   - Управление заказами
   - Список работников
   - Статистика

4. **Добавить навигацию** (Bottom Tab Bar):
   - Главная
   - Профиль
   - История / Статистика
