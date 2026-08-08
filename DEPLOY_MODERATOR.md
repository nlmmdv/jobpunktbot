# Запуск модерации: что и куда написать

Пошагово. Порядок важен: сначала ключ, потом таблицы, потом функции.

Проект Supabase: `tsicyeumkwvnfkryxfjl`

---

## Шаг 1. Новый ключ доступа

**Без этого не заработает ничего** — текущий ключ платформа отвергает
(`UNAUTHORIZED_LEGACY_JWT`, Supabase отключил ключи старого формата).

**Куда идти:** [Supabase Dashboard](https://supabase.com/dashboard/project/tsicyeumkwvnfkryxfjl/settings/api)
→ Project Settings → API Keys → скопировать **publishable key** (он же `anon`,
новый формат начинается на `sb_publishable_`).

**Что написать:** открыть файл `.env` в корне проекта и заменить строку

```
VITE_SUPABASE_ANON_KEY=<вставить новый publishable key>
```

**Как проверить** — в терминале из корня проекта:

```bash
URL=$(grep -oE "^VITE_SUPABASE_FUNCTIONS_URL=.*" .env | cut -d= -f2-); KEY=$(grep -oE "^VITE_SUPABASE_ANON_KEY=.*" .env | cut -d= -f2-); curl -s -X POST "$URL/tg-auth" -H "Content-Type: application/json" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -d '{}'
```

Должно вернуться `{"success":false,"error":"Unauthorized: initData отсутствует"}` —
это правильный ответ, ключ принят, функция ответила. Если видите
`Invalid JWT` или `Invalid API key` — ключ не тот.

---

## Шаг 2. Таблицы

**Куда идти:** [SQL Editor](https://supabase.com/dashboard/project/tsicyeumkwvnfkryxfjl/sql/new)

⚠️ **Не запускайте `supabase db push`.** База общая с большой платформой ПВЗ,
именно от `db push` был инцидент со снятием RLS (подробности в
`supabase/migrations/004_lockdown_rls.sql`).

Три миграции применяются по очереди. Для **каждой** делаем одно и то же:

1. Открыть файл, скопировать всё содержимое
2. В SQL Editor написать `BEGIN;`, вставить содержимое ниже
3. Запустить
4. Проверить результат запросом (ниже)
5. Если всё верно — написать `COMMIT;` и запустить. Если нет — `ROLLBACK;`

Файлы по порядку:

| № | Файл | Что создаёт |
|---|---|---|
| 1 | `supabase/migrations/007_moderator.sql` | Блокировки и журнал действий |
| 2 | `supabase/migrations/008_shift_incidents.sql` | Неявки на смену |
| 3 | `supabase/migrations/009_moderator_grants.sql` | Назначение модераторов |

**Проверка после всех трёх** (перед `COMMIT;` последней):

```sql
SELECT tablename, rowsecurity AS rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('moderation_blocks','moderation_actions',
                    'shift_incidents','shift_alerts','moderator_grants')
ORDER BY tablename;
```

Ожидается пять строк, у всех `rls = true`. Если строк меньше — какая-то
миграция не прошла, смотрите текст ошибки.

**Если миграция остановилась с сообщением про «Конфликт имён таблиц»** — это
сработал предохранитель: такая таблица уже есть в базе и принадлежит не нам.
Ничего не коммитьте, сделайте `ROLLBACK;` и напишите мне, какое имя
конфликтует, — переименуем наши таблицы.

---

## Шаг 3. Функции

**Где:** терминал, из корня проекта.

```bash
supabase functions deploy moderation-service check-block job-matches owner-vacancies freelancer-resumes applications cancel-match update-profile freelancer-shifts telegram-webhook shift-notifications
```

Одиннадцать функций: две новые (модерация и проверка блокировки) и девять
изменённых — в них добавлен запрет действий для заблокированных.

**Как проверить:**

```bash
URL=$(grep -oE "^VITE_SUPABASE_FUNCTIONS_URL=.*" .env | cut -d= -f2-); for fn in moderation-service check-block; do echo "$fn -> $(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/$fn" -H 'Content-Type: application/json' -d '{}' --max-time 15)"; done
```

Ожидается `401` у обеих — функция есть и требует подписи Telegram. `404`
означает, что деплой не прошёл.

---

## Шаг 4. Первый модератор

Из интерфейса взяться ему неоткуда — назначаем в базе. Человек должен **хотя
бы раз зайти в бота**, иначе профиля ещё нет.

**Куда:** SQL Editor.

Сначала найти свой профиль:

```sql
SELECT telegram_id, first_name, last_name, role FROM profiles WHERE first_name ILIKE '%ваше имя%';
```

Затем выдать права:

```sql
UPDATE profiles SET role = 'admin' WHERE telegram_id = ВАШ_TELEGRAM_ID;
```

Проверить:

```sql
SELECT telegram_id, first_name, role FROM profiles WHERE role = 'admin';
```

Дальше этот модератор назначает остальных из панели, SQL больше не нужен.
Снять права с того, кто назначен через базу, из интерфейса нельзя — только
здесь же обратным запросом.

---

## Шаг 5. Фронтенд

```bash
npm run build
```

Затем выложить папку `dist/` туда, где живёт мини-апп (Vercel подхватит сам
после `git push`, если подключён к ветке).

---

## Шаг 6. Проверка вживую

Откройте мини-апп в Telegram под аккаунтом, которому выдали `admin`.

| Что проверить | Ожидается |
|---|---|
| Вход | Открывается экран «🛡️ Модератор» вместо обычного кабинета |
| Лента сверху | «Все начатые смены подтверждены» либо список проблем |
| Раздел «Люди» | Список владельцев и сотрудников, поиск работает |
| Карточка человека | Штрафы и оценки, кнопка «Заблокировать аккаунт» |
| Блокировка на час | У человека вместо приложения экран с причиной и сроком |
| Раздел «Модераторы» | Вы в списке с пометкой «Назначен через базу» |

Проверить блокировку удобнее на тестовом аккаунте: заблокируйте на 1 час,
убедитесь, что он видит экран блокировки, затем снимите блокировку.

---

## Что заработает не сразу

**Уведомления владельцу о неявке** приходят из крона `shift-notifications` —
он должен быть заведён в pg_cron и вызываться каждые 10 минут. Проверить:

```sql
SELECT jobname, schedule, active FROM cron.job;
```

Если задания нет, уведомления не пойдут, а всё остальное будет работать.
Настройка описана в `TELEGRAM_WEBHOOK.md`.

**Сигнал модератору о неявке** сейчас уходит в один общий чат, а не всем
модераторам по роли. Это известное ограничение, чинится отдельно.

---

## Если что-то не работает

| Симптом | Причина |
|---|---|
| «Ошибка сети» на всех экранах | Шаг 1: ключ не заменён или не тот |
| `404` при проверке функций | Шаг 3: деплой не прошёл |
| Модерация открывается, но списки пустые с ошибкой | Шаг 2: миграции не применены |
| Вход как обычный владелец, «Модерации» нет | Шаг 4: роль не выдана или нужно переоткрыть мини-апп |
| В логах «Таблицы moderation_blocks нет» | Шаг 2 пропущен; приложение работает, модерация нет |

Логи функций: [Dashboard → Functions → Logs](https://supabase.com/dashboard/project/tsicyeumkwvnfkryxfjl/functions).
