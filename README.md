# ПроПункт Биржа — Telegram Mini App

Платформа для поиска работы и подработки в сфере курьерских услуг (ПВЗ).

## Стек

- **Frontend:** React 19, TypeScript, Vite, Telegram UI
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Runtime:** Node.js 20+
- **Testing:** Vitest

## Структура проекта

```
├── src/
│   ├── screens/              # Экраны приложения
│   ├── components/           # Переиспользуемые компоненты
│   ├── contexts/             # React контексты (Auth)
│   ├── lib/                  # Утилиты (API, кэш, телеграм)
│   ├── constants/            # Централизованные константы
│   ├── data/                 # Статические данные
│   └── main.tsx              # Точка входа
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── tg-auth/         # Проверка аутентификации
│   │   ├── tg-register/     # Регистрация пользователя
│   │   └── _shared/         # Общие утилиты
│   └── migrations/           # SQL миграции БД
├── __tests__/                # Unit тесты
└── .env                      # Переменные окружения
```

## Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Локальная разработка
```bash
npm run dev
```
Откроется http://localhost:5173

### Сборка для production
```bash
npm run build
```

### Тестирование
```bash
npm test           # Запустить тесты
npm run test:ui    # Vitest UI
npm run test:coverage  # Отчёт покрытия
```

### Линтинг
```bash
npm run lint
```

## Конфигурация

### .env файл
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_FUNCTIONS_URL=https://xxx.supabase.co/functions/v1
```

### Telegram Bot
Приложение использует один Telegram Bot (jobbot). Нужно установить в Supabase:
```
TELEGRAM_JOBBOT_TOKEN=<bot_token_от_@BotFather>
```

## API Functions

### tg-auth
Проверяет Telegram initData и возвращает профиль пользователя.

### tg-register
Создает новый профиль пользователя.

## Безопасность

- ✅ Все запросы к Edge Functions требуют валидную Telegram подпись
- ✅ Используется HMAC-SHA256 для верификации initData
- ✅ RLS (Row Level Security) в PostgreSQL
- ✅ Защита от IDOR атак

## Database Schema

Основные таблицы:
- `profiles` — пользователи
- `freelancer_resumes` — резюме фрилансеров
- `owner_profiles` — профили владельцев ПВЗ
- `vacancies` — вакансии/подработка
- `applications` — заявки на вакансии

Миграции: `supabase/migrations/001_init_schema.sql`

## Деплой

### Frontend
```bash
npm run build
# Deploy dist/ folder на Vercel/Netlify
```

### Edge Functions
```bash
supabase functions deploy
```

### Database
```bash
supabase db push
```
