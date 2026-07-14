# Contributing to ПроПункт Биржа

Спасибо за интерес к проекту! Вот как вы можете помочь.

## Установка для разработки

1. Форкните репозиторий
2. Клонируйте свой форк:
   ```bash
   git clone https://github.com/YOUR_USERNAME/jobpunktbot.git
   cd jobpunktbot
   ```
3. Добавьте upstream:
   ```bash
   git remote add upstream https://github.com/nlmmdv/jobpunktbot.git
   ```
4. Установите зависимости:
   ```bash
   npm install
   ```
5. Создайте новую ветку:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Развитие

### Запустить локально
```bash
npm run dev
```

### Перед отправкой

1. **Проверить код:**
   ```bash
   npm run lint
   ```

2. **Запустить тесты:**
   ```bash
   npm test
   ```

3. **Собрать:**
   ```bash
   npm run build
   ```

## Commit Messages

Используйте ясные, описательные сообщения:

```
Feat: Add user registration flow
Fix: Resolve auth token verification
Refactor: Simplify API error handling
Docs: Update database schema docs
Test: Add utils.test.ts for string validation
```

Форматы:
- `Feat:` — новая функция
- `Fix:` — исправление бага
- `Refactor:` — рефакторинг кода
- `Docs:` — документация
- `Test:` — тесты
- `Chore:` — обслуживание

## Pull Requests

1. Убедитесь что ваша ветка актуальна:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Отправьте ваше изменение:
   ```bash
   git push origin feature/your-feature-name
   ```

3. Создайте PR с понятным описанием:
   - Что изменилось?
   - Почему это нужно?
   - Как это тестировать?

## Стиль кода

- TypeScript строгий режим
- Функциональные компоненты React
- Нет пропсов сверху (используйте Context)
- Inline стили или Telegram UI компоненты
- Не добавляйте комментарии если код самоописан

## Безопасность

- Никогда не коммитьте `.env` с реальными токенами
- Всегда верифицируйте `initData` в Edge Functions
- Используйте RLS в PostgreSQL

## Вопросы?

Создайте Issue или обсудите в PR. Не стесняйтесь задавать вопросы!

Спасибо за вклад! 🚀
