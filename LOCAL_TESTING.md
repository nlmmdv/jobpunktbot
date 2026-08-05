# Локальная проверка

Как поднять приложение на своей машине, зайти под любой ролью и проверить
модерацию, не имея доступа к боевой базе.

---

## 1. Запуск

```bash
npm install && npm run dev
```

Откроется на `http://localhost:5173`.

## 2. Вход под нужной ролью

Обычный вход требует Telegram, поэтому в dev-сборке есть обход по параметру
в адресе. Работает **только** при `npm run dev`; из прод-бандла блок вырезается
сборщиком целиком (проверяется командой в разделе 6).

| Роль | Адрес |
|---|---|
| Фрилансер | `http://localhost:5173/?devRole=freelancer` |
| Владелец ПВЗ | `http://localhost:5173/?devRole=owner` |
| Администратор | `http://localhost:5173/?devRole=admin` |

Без параметра приложение пойдёт обычным путём через `tg-auth` и покажет
экран приветствия — это ожидаемо.

Модерация у администратора лежит в меню владельца: пункт **🛡️ Модерация** →
разделы «Сводка», «Пользователи», «Компании», «Вакансии».

---

## 3. Почему экраны показывают «Ошибка сети»

Это ожидаемо и не является поломкой вёрстки. Данные приходят из Supabase Edge
Functions, а сейчас до них не достучаться по трём причинам:

1. **Ключ в `.env` отвергается платформой** — `UNAUTHORIZED_LEGACY_JWT`.
   Supabase отключил legacy-JWT анон-ключи. Нужен новый publishable key.
2. **Функции модерации не задеплоены** — `moderation-service`, `list-companies`,
   `block-company`, `warn-company`, `check-company-block` отвечают 404.
3. **Миграция `007_moderation.sql` не применена** — нет таблиц блокировок,
   предупреждений и жалоб.

Проверить первое и второе:

```bash
URL=$(grep -oE "^VITE_SUPABASE_FUNCTIONS_URL=.*" .env | cut -d= -f2-); for fn in tg-auth moderation-service; do echo "$fn -> $(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/$fn" -H 'Content-Type: application/json' -d '{}' --max-time 15)"; done
```

`401` — функция есть, но ключ/подпись не приняты. `404` — функция не задеплоена.

---

## 4. Проверка интерфейса без бэкенда

Пока блокеры не сняты, интерфейс проверяется подстановкой ответов прямо
в браузере. Исходный код при этом не меняется.

Откройте `http://localhost:5173/?devRole=admin`, нажмите **F12** → вкладка
**Console**, вставьте и выполните:

```js
(function () {
  const orig = window.fetch;
  const users = [
    { id:'u1', telegram_id:111111111, first_name:'Иван', last_name:'Петров', role:'employee', city:'Москва', status:'active', created_at:'2026-07-01T10:00:00Z', is_blocked:false, block:null, warning_count:0, open_complaints:2 },
    { id:'u2', telegram_id:222222222, first_name:'Пётр', last_name:null, role:'owner', city:null, status:'active', created_at:'2026-06-01T10:00:00Z', is_blocked:true, block:{ id:'b1', reason:'Спам в откликах', expires_at:null, created_at:'2026-08-01T10:00:00Z' }, warning_count:3, open_complaints:0 },
  ];
  const companies = [
    { id:'p1', telegram_id:444444444, first_name:'Мария', last_name:'Сидорова', organization_name:'Мария Сидорова', phone:'+7 495 123-45-67', city:'Москва', status:'active', created_at:'2026-03-01T10:00:00Z', is_blocked:false, block:null, warning_count:0, open_complaints:2 },
  ];
  const vacancies = [
    { id:'v1', address:'ул. Тверская, 15', description:'Обычное описание', payment:3000, telegram_id:444444444, first_name:'Мария', created_at:'2026-08-04T10:00:00Z', has_spam:false },
    { id:'v2', address:null, description:'Пиши в whatsapp +7 999 000 11 22', payment:null, telegram_id:555555555, first_name:null, created_at:'2026-08-03T10:00:00Z', has_spam:true },
  ];
  const complaints = [
    { id:'k1', reason:'Грубое общение', description:'Нахамил на смене', status:'open', created_at:'2026-08-02T10:00:00Z', reported_by:{ id:'u2', first_name:'Мария', last_name:'Сидорова', telegram_id:222222222 } },
  ];

  window.__calls = [];
  window.fetch = async function (url, init) {
    const u = String(url);
    if (!u.includes('/functions/v1/')) return orig.apply(this, arguments);
    const body = JSON.parse(init?.body || '{}');
    window.__calls.push({ fn: u.split('/functions/v1/')[1], ...body, initData: undefined });
    let p = { success: true };
    switch (body.action) {
      case 'stats': p = { success:true, stats:{ new_users_today:4, new_vacancies_today:2, matches_this_week:9, suspicious_vacancies:1, open_complaints:6, active_blocks:7 } }; break;
      case 'list_users': case 'new_users': p = { success:true, users }; break;
      case 'list_companies': p = { success:true, companies }; break;
      case 'vacancies_for_review': p = { success:true, vacancies }; break;
      case 'user_complaints': case 'company_complaints': p = { success:true, complaints }; break;
      case 'warn_user': case 'warn_company': p = { success:true, warning_count:3, auto_blocked:true }; break;
    }
    return new Response(JSON.stringify(p), { status:200, headers:{ 'Content-Type':'application/json' } });
  };
  console.log('Подстановка включена. Что ушло на сервер — в window.__calls');
})();
```

Перехват живёт до перезагрузки страницы. После каждого действия смотрите
`window.__calls` — там видно, какой запрос ушёл бы на сервер.

### Что стоит прокликать

| Проверка | Ожидаемо |
|---|---|
| Блокировка → «Заблокировать» с пустой причиной | Предупреждение, запрос **не** уходит, окно не закрывается |
| Блокировка с причиной и сроком «1 день» | В `__calls`: `action: block_user`, `durationMinutes: 1440` |
| Предупреждение | Сообщение про автоблокировку после третьего |
| Быстрый набор в поиске | В `__calls` **один** запрос, а не по одному на символ |
| Заблокированный в списке | Кнопка «Разблокировать», причина и срок |
| Раздел «Вакансии» | Фильтр «Все / Подозрительные», спам обведён красным |
| Жалобы | «Жалобы на: Имя», внутри «Пожаловался: Имя» — их нельзя перепутать |
| Пустые поля (`last_name`, город, адрес) | Прочерки, вёрстка не разъезжается |

Жалобу со стороны фрилансера смотреть на `?devRole=freelancer` → «Вакансии» →
🚩 на карточке. В `__calls` должно уйти `submit-company-complaint`
с `owner_telegram_id`.

---

## 5. Проверка на реальных данных

Возможна после того, как сняты три блокера из раздела 3. Порядок важен:

```bash
# 1. Новый ключ в .env (publishable key из Supabase → Settings → API)
# 2. Миграцию применить ВРУЧНУЮ в SQL Editor, обязательно в транзакции:
#    BEGIN;  <содержимое supabase/migrations/007_moderation.sql>
#    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'
#      AND tablename IN ('complaints','company_complaints','moderation_blocks',
#                        'moderation_warnings','moderation_actions');
#    -- убедились, что чужие таблицы не задеты → COMMIT; иначе → ROLLBACK;
# 3. Деплой функций:
supabase functions deploy moderation-service list-companies block-company \
  warn-company check-company-block submit-complaint submit-company-complaint
```

Не запускать `supabase db push` — база общая с большой платформой,
подробности в `supabase/migrations/004_lockdown_rls.sql`.

Назначить себе роль администратора:

```sql
UPDATE profiles SET role = 'admin' WHERE telegram_id = ВАШ_TELEGRAM_ID;
```

Затем зайти на `http://localhost:5173` **без** `devRole` из Telegram-клиента.

---

## 6. Проверка через Telegram Mini App

Единственный способ проверить настоящий вход: подпись `initData` формирует сам
Telegram, и подделать её нельзя. `?devRole` этот путь как раз обходит, поэтому
в мини-аппе он полезен только для беглого осмотра экранов.

### 6.1. Публичный HTTPS-адрес

Telegram не открывает `localhost` — нужен туннель к дев-серверу.
`vite.config.ts` уже содержит `allowedHosts: true`, править ничего не нужно.

Ни `cloudflared`, ни `ngrok` на машине сейчас не установлены — поставить можно так:

```bash
brew install cloudflared        # либо: brew install ngrok
```

```bash
npm run dev                                       # терминал 1
cloudflared tunnel --url http://localhost:5173    # терминал 2
```

Выдаст адрес вида `https://<случайное-имя>.trycloudflare.com`. Альтернатива —
`ngrok http 5173`. Адрес меняется при каждом перезапуске туннеля, и в BotFather
его придётся обновлять.

### 6.2. Привязать адрес к боту

В [@BotFather](https://t.me/BotFather):

1. `/newapp` → выбрать бота → указать адрес из туннеля → задать короткое имя.
   Мини-апп откроется по ссылке `t.me/<имя_бота>/<короткое_имя>`.
2. Либо `/setmenubutton` → выбрать бота → адрес из туннеля. Тогда мини-апп
   открывается кнопкой рядом с полем ввода в чате с ботом.

### 6.3. Согласовать бота с бэкендом

**Важно:** мини-апп нужно открывать у того же бота, чей токен лежит
в `TELEGRAM_JOBBOT_TOKEN` секретов Supabase. Подпись считается через этот токен —
у другого бота проверка не пройдёт и вход завершится ошибкой
`initData: неверная подпись`.

```bash
supabase secrets list                      # посмотреть, что задано
supabase secrets set TELEGRAM_JOBBOT_TOKEN=<токен_от_BotFather>
```

Есть обход для отладки — он принимает `hash=dev-mode` без проверки подписи:

```bash
supabase secrets set ALLOW_DEV_AUTH=true
```

Включать только на тестовом проекте. На боевом это дыра: любой сможет прислать
чужой `telegram_id` и работать от его имени. После проверки снять:
`supabase secrets unset ALLOW_DEV_AUTH`.

### 6.4. Что можно проверить

| Проверка | Как |
|---|---|
| Вход по настоящей подписи | Открыть мини-апп; профиль подтянется по вашему `telegram_id` |
| Роль администратора | `UPDATE profiles SET role='admin' WHERE telegram_id=…`, переоткрыть мини-апп — появится пункт «🛡️ Модерация» |
| Блокировка на входе | Заблокировать себя в разделе модерации со второго аккаунта, переоткрыть мини-апп — вместо приложения экран с причиной и сроком |
| Жалоба на ПВЗ | «Вакансии» → 🚩 → причина → отправить; жалоба появится у администратора |
| Оценки и рейтинг | Ставятся **в чате с ботом**, не в мини-аппе: после смены приходит сообщение с ⭐1–5 (рассылает крон `shift-notifications`) |

Перезапуск мини-аппа: закрыть окно и открыть заново. Telegram кеширует
страницу — если правки не видны, помогает «Очистить кеш» в настройках клиента
или смена адреса туннеля.

### 6.5. Консоль внутри мини-аппа

- **Telegram Desktop:** Настройки → Продвинутые → Экспериментальные →
  включить инспектирование webview, затем правый клик в мини-аппе → «Inspect».
- **Телефон:** консоли нет. Быстрый способ — временно подключить
  [eruda](https://github.com/liriliri/eruda) в `index.html`, но не забыть убрать
  перед выкладкой.

### 6.6. Чего это не проверит

Все три блокера из раздела 3 действуют и здесь. Пока анон-ключ отвергается
платформой, а функции модерации отвечают 404, мини-апп покажет ровно те же
ошибки, что и браузер, — просто внутри Telegram. Настоящую проверку модерации
даёт только последовательность из раздела 5.

Бот при этом можно проверять отдельно: настройка вебхука описана
в `TELEGRAM_WEBHOOK.md`, отправка сообщений без реального бота — в `BOT_TESTING.md`.

---

## 7. Проверки перед выкладкой

```bash
npm run build          # типы + прод-сборка
npx tsc --noEmit       # только типы
grep -ro "devRole" dist/assets/   # должно быть пусто: DEV-обход не в бандле
```

Сборка edge-функций (Deno локально не нужен):

```bash
for d in supabase/functions/*/; do f="$d/index.ts"; [ -f "$f" ] && npx --yes esbuild --bundle --platform=neutral --format=esm "--external:https://*" "$f" --outfile=/dev/null 2>&1 | grep -E "error" && echo "FAIL $d"; done; echo "готово"
```
