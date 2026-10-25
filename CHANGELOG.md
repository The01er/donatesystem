# История изменений

Все значимые изменения DonatePlatform фиксируются в этом файле.

---

## 2026-10-25 — Подготовка к публикации

- Очищены секреты: `packages/api/.env` обнулён, тестовые пароли БД вынесены в `TEST_DATABASE_URL`.
- Из истории удалены бэкапы БД, `mc-test`, `uploads`, артефакты сборки и `VPS_SETUP.md` (`.git` 700 МБ → ~1 МБ).
- Обезличены домены/IP и демо-данные; добавлены `LICENSE` (MIT) и `README.md`.
- Добавлен `vue-tsc`, исправлены ошибки типов — API и web проходят typecheck.

## 2026-07-27

- Исправлена ошибка `ReferenceError: $api is not defined / auth is not defined` на `/dashboard`:
  - Добавлены пропущенные `const $api = useApi()`, `const auth = useAuthStore()`, `const router = useRouter()`
  - Пересобран и перезапущен Nuxt

## 2026-07-26

- Отредактирован гайд «Как сделать донат на сервере Minecraft»:
  - Бренд `DonatePlatform` → `DonatePlatform`
  - Способы оплаты: ЮKassa, AnyPay, Enot.io, ЮMoney (вместо устаревших Qiwi/WebMoney)
  - Убрана авторизация через Mojang/Microsoft
  - Убран функционал «Подарить донат»
  - Исправлены команды и описание доставки
  - Гайд опубликован (`published: 1`)

## [0.47.0] — 2026-07-16

### Добавлено
- Google Analytics (G-NEVKJ4QW8W): скрипт всегда в `<head>` SSR, `gtag('config')` после согласия
- SVG favicon (пиксельное сердце + монета)
- SEO метатеги (title, description, og) на страницы: shop/[slug], forgot-password, reset-password, faq, shop-legal/[slug]/[docSlug]
- `header_up Host {host}` в Caddy — оригинальный домен передаётся в бэкенд для shop-резолвера

### Изменено
- Переход на production-сборку: `pnpm build` + `node dist/index.js` / `node .output/server/index.mjs`
- Systemd-сервис: production-режим (NODE_ENV=production)
- CookieBanner: убран `reload()` после согласия — метрики включаются на следующем переходе без перезагрузки
- CSP: добавлены `mc.yandex.com`, `*.google-analytics.com`, `data:` в font-src
- `useShop.ts` — удалён дублирующийся `useHead` с SEO (теперь задаётся в `shop/[slug].vue`)

### Исправлено
- Настройка подписки: trial/expired/бесплатные подписки используют глобальную цену из PlatformSettings, активные платные — сохранённую цену
- `nuxt.config.ts` — убран `prerender: true` для `/`, чтобы хост-резолвер работал на кастомных доменах
- CSP: восстановлены строки `style-src` и `img-src` (случайно удалены при редактировании)

### База данных
- Prod-БД очищена: удалены все не-админ пользователи, серверы, заказы, товары и связанные данные
- Оставлены: PlatformSettings, PlatformStaff (2 админа), Faq (12), Guide (1), News, LegalDocument, LandingContent

## [0.46.2] — 2026-07-11

### Добавлено
- Бесплатная подписка: при цене 0 в БД подписка продлевается без платёжного шлюза, отображается «Бесплатно» на лендинге и в дашборде

### Исправлено
- subscriptionPrice=0 не работал — falsy-проверки в 4 местах (landing.ts, platform-settings.ts, servers.ts x2) заменены на проверку существования объекта
- Настроен git: dev→prod через `git push`, ветка `main` на обоих серверах

## [0.46.1] — 2026-07-07

### Добавлено
- Production сборка: скрипты `build` и `start` для API (tsc) и Web (nuxt build)
- SEO: changed title template from `%s | DonatePlatform` to `%s | DonatePlatform` (lowercase)
- Client-side fetch fallback для лендинга и resolveShop — обход бага SSR в Nuxt 3.21
- Спиннер загрузки при открытии витрины по кастомному домену (без мигания лендингом)
- Игнорирование корневых файлов `.output` и `app.vue` в `.gitignore`

### Исправлено
- ShopTemplateGaming.vue: восстановлена недостающая закрывающая `</div>` для блоков `v-if="donators"` и `v-if="shop"`, вызывавшая 500 ошибку (Vite Error — "Element is missing end tag")
- Настроена SSH-авторизация между dev и prod серверами для удалённого деплоя
- SEO: исправлен дублирующийся суффикс в title на странице гайдов
- Service: production-режим (build + start вместо dev), NODE_ENV=production, Environment=CI=true
- Index.vue: удалён мусорный код после рефакторинга, вызывавший `Unexpected token (40:6)`

### Текущий режим
- Временно переключено на dev-режим (pnpm dev) для ускорения итераций без пересборок
- Production-сборка (build + start) готова к включению в любой момент

---

## [0.1.0] — 2026-05-25 01:30 МСК

### Добавлено

- **Структура монорепо**: pnpm workspace с пакетами `@donate/api` (Fastify) и `@donate/web` (Nuxt 3)
- **Prisma-схема**: модели `User`, `Server`, `Product`, `Order` с индексами, полями `imageUrl`, `actionsJson`, `customDomain`, `verifiedDns`
- **Аутентификация**: регистрация, вход, JWT-токены, хеширование bcrypt, Pinia-стор, защита маршрутов
- **CRUD серверов**: создание, чтение, обновление, удаление игровых серверов с проверкой владельца
- **CRUD товаров**: создание, чтение, обновление, удаление товаров с картинкой, ценой и JSON-командами
- **Управление заказами**: таблица заказов, отслеживание статусов (pending/paid/delivered/cancelled)
- **Публичная витрина**: страница `/shop/[slug]` с сеткой товаров и модальным окном покупки (ввод ника, имитация оплаты)
- **Система доменов**: стандартные поддомены (`slug.shop.localhost`), поддержка пользовательских доменов, проверка CNAME через `dns.resolveCname`
- **Host middleware**: автоматическое определение магазина по заголовку Host (поддомен + кастомный домен)
- **Админ-панель**: список серверов, вкладки (Обзор, Товары, Заказы, Домен), тёмная тема на Tailwind CSS
- **Nuxt dev proxy**: запросы `/api` проксируются на Fastify-бэкенд на `0.0.0.0:3001`
- **Скрипты разработки**: `pnpm dev`, `pnpm db:push`, `pnpm db:generate`, `pnpm db:studio`
- **MySQL-дамп**: файл `prisma/init.sql` с готовым DDL (таблицы, индексы, внешние ключи)

### Стек

- Фронтенд: Nuxt 3.21 + Vue 3.5 + Pinia 3 + Tailwind CSS 4
- Бэкенд: Fastify 5 + TypeScript + Zod + JWT + bcryptjs
- База данных: Prisma 6 + SQLite (разработка) / MySQL или PostgreSQL (продакшен)
- Инструменты: pnpm 11, tsx, Node.js 22 LTS

---

## [0.2.0] — 2026-05-25 02:30 МСК

### Добавлено

- **Система действий (Actions)**: Zod-валидатор `actionsJson` с 12 типами действий
  - Атомарные: `command`, `add_group`, `remove_group`, `give_item`, `remove_item`, `give_money`, `broadcast`, `play_sound`, `send_to_server`
  - Условные: `if_has_group`, `if_missing_group`, `if_has_permission` (с вложенными `then`/`else`)
  - Плейсхолдеры: `{player}`, `{order_id}`, `{server}`
  - Версионирование: `actionsSchemaVersion` в модели Product
  - Валидация в строку хранения: JSON-парсинг → проверка → обратная сериализация
- **Модель доставки**: `DeliveryAttempt` с полем `rollbackStatus` (откат действий)
- **Заказы**: поля `retryCount`, `maxRetries`, `lastError`, `committedActions`, `totalAmount`, `commissionPct`, `commissionAmt`, `ownerAmount`
- **API плагинов** (`/api/plugin/*`):
  - `GET /orders` — получение заказов со статусом `paid`
  - `POST /orders/:id/start` — оптимистичная блокировка (`paid` → `delivering`)
  - `POST /orders/:id/action-result` — логирование выполнения/ошибки действия
  - `POST /orders/:id/complete` — завершение доставки (`delivering` → `delivered`)
  - `POST /orders/:id/rollback-result` — логирование отката действия
- **Токены плагинов**: модель `ServerPluginToken`, CRUD-эндпоинты
- **Роли сервера**: модель `ServerMember` (`owner` | `admin` | `moderator`)
- **Кошелёк владельца**: модель `Wallet` + `Transaction` для учёта комиссий и выплат
- **Карта отката**: `REVERSE_ACTION_MAP` и `buildRollbackAction()` для обратимых действий
- **MySQL-дамп** обновлён: 10 таблиц, внешние ключи, индексы

### Изменено

- Prisma-схема: расширена с 4 до 9 моделей, добавлены составные индексы
- Валидация `actionsJson` встроена в CRUD товаров (создание/обновление)
- `Order.status` расширен: `pending` → `paid` → `delivering` → `delivered` | `failed`

---

## [0.3.0] — 2026-05-25 03:30 МСК

### Добавлено

- **Wallet на уровне Server**: кошелёк перенесён с User на Server (раздельные счета для разных магазинов)
  - Авто-создание кошелька при создании сервера
  - Зачисление `ownerAmount` при успешной доставке заказа (`status: delivered`)
  - Расчёт комиссии (10%) при создании заказа: `totalAmount`, `commissionAmt`, `ownerAmount`
- **Финансы** (`/dashboard/[id]/finance`):
  - Карточки: баланс, всего заработано, комиссия платформы (месяц), ожидает вывода
  - График доходов за 7 дней (встроенные бары)
  - Таблица транзакций с пагинацией
  - Вывод средств: модалка (amount, method, destination), заявка `WithdrawalRequest`
  - API: `GET /api/servers/:id/wallet`, `GET /transactions`, `POST /withdraw`, `GET /withdrawals`, `GET /api/user/balance`
- **Команда** (`/dashboard/[id]/team`):
  - Таблица участников с ролями (owner, admin, moderator)
  - Приглашение по email, смена роли, удаление
  - Авто-создание owner-записи при создании сервера
  - API: `GET/POST /api/servers/:id/members`, `PUT/DELETE /:memberId`
- **Сайдбар админки** (`layouts/dashboard.vue`):
  - Список серверов с иконками игр, кнопка создания
  - Адаптивность: бургер-меню на мобильных
  - Активный сервер подсвечен
- **Улучшенный Обзор** (`/dashboard/[id]/index.vue`):
  - 4 карточки статистики: заказы сегодня, доход сегодня, баланс, комиссия (месяц)
  - График доходов за 7 дней (компактная версия)
  - Последние 5 заказов в таблице
  - Ссылка на публичную витрину
  - API: `GET /api/servers/:id/stats`
- **Composables**: `useWallet()`, `useTeam()`, `useServerStats()`

### Изменено

- Prisma-схема: Wallet (userId → serverId), +WithdrawalRequest, +индексы по createdAt
- Server создаётся вместе с Wallet и ServerMember(owner)
- ServerPluginToken: +поле `createdAt`
- Удалён дублирующий импорт `lookup` из `node:dns`
- Все страницы дашборда используют layout `dashboard`

### Модели (10 таблиц)

User, Server, Product, Order, DeliveryAttempt, ServerPluginToken, ServerMember, Wallet, Transaction, WithdrawalRequest

---

## [0.4.0] — 2026-05-25 04:30 МСК

### Добавлено

- **Супер-админка**: API `/api/admin/*` для управления платформой
  - `GET /stats` — общая статистика (пользователи, серверы, заказы, доход)
  - **Users**: `GET /users` (пагинация, фильтр по статусу), `GET /users/:id` (серверы, заказы), `POST /users/:id/ban`, `POST /users/:id/unban`
  - **Servers**: `GET /servers` (фильтр по игре, поиск, статус), `GET /servers/:id`, `POST /servers/:id/block`, `POST /servers/:id/unblock`
  - **Withdrawals**: `GET /withdrawals` (фильтр по статусу), `POST /approve` (списание баланса + payout-транзакция), `POST /reject`, `POST /pay`
  - **Transactions**: `GET /transactions` (фильтр по типу, serverId, дате)
  - **Orders**: `GET /orders` (фильтр по статусу, serverId, дате), `POST /orders/:id/cancel`
  - **Staff**: `GET/POST /staff`, `PUT/DELETE /staff/:id`
  - **Settings**: `GET/PUT /settings` (commissionPct, platformDomain, cnameTarget)
- **PlatformRole enum**: `SUPER_ADMIN`, `ADMIN`, `SUPPORT`, `FINANCE`
- **Модель PlatformStaff**: связь User → роль платформы, isActive
- **Модель PlatformSettings**: глобальные настройки (commissionPct, domain, CNAME target)
- **Бан пользователей**: поле `bannedAt`/`banReason` в User, проверка при login → 403
- **Блокировка серверов**: поле `blockedAt`/`blockReason` в Server
- **Middleware `authStaff`**: проверка JWT → PlatformStaff (isActive: true) → доступ
- **Seed**: авто-создание `PlatformSettings(id: "global")` при запуске

### Изменено

- Prisma-схема: +PlatformRole, +PlatformStaff, +PlatformSettings, поля в User/Server, @@index([type]) в Transaction
- `POST /withdraw`: убрано мгновенное списание баланса и payout-транзакция
- `auth/login`: проверка `bannedAt` перед выдачей токена
- `WithdrawalRequest.status`: +`paid` (после выплаты)
- `shop.ts`: проверка `server.blockedAt` — заблокированные серверы маскируются под 404
- `plugin.ts`: проверка `server.blockedAt` в middleware аутентификации плагинов → 403
- `admin.ts`: исправлена ролевая проверка в `GET /admin/withdrawals` (FINANCE+)

### Frontend админ-панель (13 файлов)

- **Layout**: `layouts/admin.vue` — сайдбар с меню, подсветка активного пункта, бургер-меню на мобильных
- **Middleware**: `middleware/admin.ts` — проверка PlatformStaff через `GET /api/admin/stats`
- **Composable**: `composables/useAdmin.ts` — `$fetch`-обёртка для `/api/admin/*`
- **Компонент**: `components/Pagination.vue` — пагинация с Prev/Next и номерами страниц
- **Страницы**:
  - `/admin` — 6 карточек статистики (totalUsers, totalServers, ordersToday, revenueToday, totalOrders, totalVolume)
  - `/admin/users` — таблица, фильтр по email/статусу, бан/разбан с модалкой причины
  - `/admin/users/[id]` — серверы пользователя, заказы, назначение/снятие роли платформы
  - `/admin/servers` — таблица, фильтр по игре/поиску/статусу, блокировка с модалкой
  - `/admin/servers/[id]` — статистика, кошелёк, последние заказы
  - `/admin/withdrawals` — таблица, фильтр по статусу, Approve/Reject/Paid
  - `/admin/orders` — фильтр по статусу + диапазон дат, Cancel
  - `/admin/transactions` — фильтр по типу + датам, read-only
  - `/admin/staff` — CRUD персонала, смена роли, деактивация (SUPER_ADMIN only)
  - `/admin/settings` — форма: комиссия (%), домен платформы, CNAME-цель

### Модели (12 таблиц)

+PlatformStaff, +PlatformSettings

---

## [0.4.1] — 2026-05-25

### Исправлено (аудит безопасности и качества кода)

#### Бэкенд — 8 критических багов

- **`plugins/auth.ts`** — добавлен `return` перед `reply.status(401).send(...)`. Без него аутентификация не прерывала выполнение хендлера (запрос без токена доходил до бизнес-логики).
- **`routes/plugin.ts` — `/orders/:id/start`** — заменён TOCTOU-паттерн (`findFirst` → `update`) на атомарный `updateMany` с условием `status: 'paid'`. Устраняет гонку при одновременной доставке двумя инстансами плагина.
- **`routes/plugin.ts` — `/orders/:id/complete`** — обёрнуто в `prisma.$transaction()`. Три раздельных записи (order → delivered, wallet +, transaction) теперь атомарны — исключена потеря денег при падении между операциями. Исправлен баг `||` → `??` для `ownerAmount` (нулевая комиссия на бесплатных товарах). Комиссия берётся из поля `commissionPct` заказа, а не хардкод `* 0.9`.
- **`routes/admin.ts` — `/withdrawals/:id/approve`** — обёрнуто в `prisma.$transaction()` с перепроверкой баланса. Защита от ухода в минус при конкурентном подтверждении.
- **`routes/shop.ts` — `POST /order`** — комиссия читается из `PlatformSettings.defaultCommissionPct` вместо хардкода `10.0`. Настройка из админки теперь реально применяется.
- **`routes/wallet.ts` — `POST /withdraw`** — проверка доступного баланса учитывает сумму pending-заявок (`wallet.balance - pendingSum`). Предотвращает создание заявок на сумму больше баланса.
- **`config.ts`** — JWT-секрет: в `NODE_ENV=production` без `JWT_SECRET` сервер отказывается запускаться (`throw Error`), а не падает на dev-значение.

#### Фронтенд — 3 критических бага

- **`stores/auth.ts`** — `JSON.parse(u)` в `loadFromStorage()` обёрнут в `try/catch`. Битый localStorage больше не крашит приложение — данные зачищаются.
- **`types/index.ts`** — `Paginated<T, K extends string = 'items'>` — дженерик-тип с настраиваемым ключом данных. Больше не хардкодит `transactions`, пригоден для users/servers/orders.
- **18 файлов (33 блока)** — все пустые `catch {}` заменены на `catch (e) { console.error(e) }`. Ошибки API больше не глотаются молча.

#### Инфраструктура

- **`.gitignore`** — исключены `node_modules/`, `.nuxt/`, `.output/`, `dist/`, `.env`, IDE-файлы, логи.
- **ESLint** — flat config (`eslint.config.mjs`): `@eslint/js` + `typescript-eslint` + `eslint-config-prettier`. `any` → warn.
- **Prettier** — `.prettierrc`: `singleQuote`, `trailingComma: all`, `printWidth: 120`. Кодовая база отформатирована.
- **Vitest** — 2 проекта (api + web), workspace через `test.projects`, 12 тестов (config + status helpers).

### Новые скрипты

- `pnpm test` — прогон всех тестов
- `pnpm test:watch` — watch-режим
- `pnpm lint:eslint` — ESLint по `packages/`
- `pnpm format` — автоформатирование Prettier
- `pnpm format:check` — проверка форматирования

---

## [0.4.2] — 2026-05-25

### Добавлено

#### Система сессий (Session management)

- **Модель `UserSession`** (13-я таблица): `id` (UUID = jti), `userId`, `userAgent`, `ipAddress`, `expiresAt`, `createdAt`, `lastUsedAt`
- **JWT c `jti`**: токен подписывается с `{ id: userId, jti: sessionId }`, `expiresIn: '7d'`
- **Создание сессии** при login/register — запись UserAgent + IP
- **Проверка сессии** в `authenticate` и `authStaff` preHandler'ах — после JWT-верификации проверяется наличие активной сессии в БД. Просроченная или удалённая → 401
- **`POST /api/auth/logout`** — удаление текущей сессии из БД, токен невалиден мгновенно
- **`GET /api/auth/sessions`** — список активных сессий пользователя (userAgent, IP, время)
- **`DELETE /api/auth/sessions/:id`** — отзыв другой сессии (текущую нельзя)
- **Админ-контроль**: `GET /api/admin/users/:id/sessions`, `DELETE /api/admin/sessions/:id`
- **Автоочистка**: при старте и каждый час `DELETE` истёкших сессий

### Исправлено

#### Бэкенд

- **`validators/actions.ts`** — `validatePlaceholders` больше не no-op: убрано избыточное условие `/^\{[a-z_]+\}$/`, только известные плейсхолдеры (`{player}`, `{order_id}`, `{server}`)
- **`routes/auth.ts`** — JWT-токены получили `expiresIn: '7d'` (раньше жили вечно)
- **`routes/plugin.ts`** — `JSON.parse(committedActions)` обёрнут в try-catch в двух местах (action-result, complete)
- **`index.ts`** — добавлен глобальный `setErrorHandler`: в production отдаёт `Internal Server Error`, в dev — message + stack

#### Фронтенд

- **`dashboard/[id]/index.vue`** — URL витрины исправлен: UUID заменён на реальный slug (запрос к `/api/servers/:id`)
- **`dashboard/[id]/orders.vue`** — `statusClass` дополнен статусами `delivering`/`failed`
- **`types/index.ts`** — `WithdrawalRequest.status` включает `'paid'` (было только `'completed'`)

#### Рефакторинг: устранение дублирования

- **`utils/status.ts`** — `orderStatusClass()`, `withdrawalStatusClass()`, `transactionTypeClass()` — заменили 8 локальных копий в 7 файлах
- **`utils/format.ts`** — `fmtDate()` — заменил 6 локальных копий
- **`composables/useStaffCan.ts`** — `isAdmin()`, `isFinance()`, `can()` — заменил 6 повторений `staffRole && ['SUPER_ADMIN','ADMIN'].includes(staffRole)`

### Модели (13 таблиц)

+UserSession

---

## [0.4.3] — 2026-05-25

### Безопасность

- **httpOnly Cookie** — JWT-токен больше не хранится в `localStorage`. Устанавливается сервером через `Set-Cookie` с флагами `httpOnly`, `secure` (в production), `sameSite: lax`. Полностью исключает XSS-экстракцию токена.
  - Бэкенд: `@fastify/cookie`, `@fastify/jwt` читает токен из cookie
  - Фронтенд: `stores/auth.ts` — убран `token` из localStorage, только `user`. Все `$fetch` вызовы заменены на `credentials: 'include'` (браузер отправляет cookie автоматически)
  - Proxy: `server/api/[...].ts` пробрасывает `Set-Cookie` от API клиенту
  - 24 замены `Authorization: Bearer` → `credentials: 'include'`
  - Middleware `auth.ts`/`admin.ts` проверяют `auth.user` вместо `auth.token`
- **Rate-limit** — `@fastify/rate-limit`: глобальный лимит 100 req/min, на `/api/auth/login` и `/api/auth/register` — 5 попыток за 5 минут (защита от брутфорса)
- **x-forwarded-host** — заголовок доверяется только при запросе от локального прокси (`127.0.0.1`, `::1`). Прямой доступ к API не может подменить хост.

### Исправлено

- **Типы Fastify** — декларированы `staffMember` и `pluginToken` на `FastifyRequest`, `user`/`payload` для `@fastify/jwt`. **19 ошибок TS → 0**.
- **implicit `any`** — добавлены явные типы в `wallet.ts:reduce` коллбэках

### Исправлено (навигация и рефакторинг)

- **Навигация в админке** — `pages/admin.vue` перенесён в `pages/admin/index.vue`. Конфликт Nuxt 3: `admin.vue` + `admin/` поддиректория превращали `admin.vue` в родительскую обёртку без `<NuxtPage />`, из-за чего дочерние страницы (`/admin/users`, `/admin/orders`...) не рендерились.
- **Двойной `v-if` в `admin/orders.vue`** — после замены ролевого чека остался лишний `v-if="`, ломавший компиляцию страницы
- **`useStaffCan` — вложенный ref** — `ref(inject(...))` создавал `Ref<Ref<string>>`. Заменено на `inject<Ref<string>>('staffRole', ref(''))` — `isAdmin()` теперь корректно возвращает `true/false`
- **`middleware/admin.ts`** — убран catch-all `navigateTo('/')` на любую ошибку. Теперь только 401 → login, 403 → abort. Транзиентные ошибки пропускаются
- **`definePageMeta`** — перенесён после импортов во всех 9 админ-страницах (Nuxt-конвенция)
- **Дублирование `inject('staffRole')`** — в 3 страницах убран дублирующий вызов, `staffRole` деструктурируется из `useStaffCan()`
- **Proxy `Set-Cookie`** — `server/api/[...].ts` пробрасывает заголовок `set-cookie` от API клиенту

---

## [0.5.0] — 2026-05-25

### Добавлено

- **Глобальный B2B-SaaS Редизайн**: Полностью переработана визуальная стилистика всей платформы (25 страниц и шаблонов) в духе современных продуктов Linear, Vercel, Clerk с акцентом на светлую тему по умолчанию.
- **Переключатель тем (ThemeToggle.vue)**: Новый адаптивный компонент переключения темы (Солнце/Луна) на базе плавных SVG-иконок. Настроен автоматический выбор темы по `matchMedia` операционной системы и сохранение пользовательских предпочтений в `localStorage`. Компонент интегрирован в подвалы сайдбаров обеих панелей управления.
- **Двухрежимная Дизайн-Система (Tailwind CSS 4)**:
  - **Светлая тема (по умолчанию)**: Фон `bg-slate-50`, карточки `bg-white` с границами `border-slate-200` и тенями `shadow-sm`, основной текст `text-slate-600`/`text-slate-900`, акцентные элементы в цветах `indigo-600`.
  - **Тёмная тема (`dark:`)**: Премиальная Slate палитра с фоном `dark:bg-slate-900`, карточками `dark:bg-slate-800` и границами `dark:border-slate-700`.
- **Полная Адаптивность**: Все админ-таблицы обёрнуты в контейнеры горизонтального скролла (`overflow-x-auto`) для безупречного отображения на мобильных экранах. Вёрстка мобильных сайдбаров дополнена стильным размытием `backdrop-blur-sm`.
- **Совершенствование UX на Главной странице**: На главной странице (`pages/index.vue`) оптимизирована навигация, удалена дублирующая шапка и кнопки авторизации, предотвращая дублирование интерфейсов.

### Изменено

- **Типографика**: Подключен шрифт **Inter** во всех начертаниях (400, 500, 600, 700) и **JetBrains Mono** для моноширинного кода и табличных чисел в `nuxt.config.ts`.
- **Скругления и Инпуты**: Элементы интерфейса стандартизованы по скруглениям: `rounded-lg` для кнопок и полей ввода, `rounded-xl` для карточек статистики и списков, `rounded-2xl` для модальных окон. Фокусные кольца переведены на кольца толщиной 2px в цветах Indigo с отступом (`ring-2 ring-indigo-500 ring-offset-2`).
- **Стилизация Списков и Кнопок**: Добавлены мягкие анимационные hover-эффекты (`transition-all duration-200 hover:-translate-y-0.5`).
- **Локализация**: Все элементы переработанных интерфейсов русифицированы для большего удобства русскоязычных владельцев серверов.

---

## [0.6.0] — 2026-05-25

### Добавлено

#### Визуальный конструктор действий (Vue Flow)

- **Зависимости**: установлены `@vue-flow/core@^1.48.2`, `@vue-flow/background@^1.3.2`, `@vue-flow/controls@^1.1.3`
- **Компоненты палитры и узлов**:
  - `ActionPalette.vue` — левая панель 240px с 11 draggable-блоками, сгруппированными в 4 категории (Основные, Группы и права, Предметы и валюта, Условные). HTML5 Drag API: `dataTransfer.setData('application/action-type', type)`
  - `ActionNode.vue` — узел-блок на холсте Vue Flow: Handle (target/source), заголовок с эмодзи-иконкой + русским названием, кнопки удалить/дублировать. Для условных типов (`if_has_*`) — зоны then/else с drag-and-drop и кнопкой "+"
  - `ActionNodeConfig.vue` — форма параметров внутри узла: 10 типов действий (command, add_group, remove_group, give_item, remove_item, give_money, broadcast, play_sound, send_to_server, if_has_*), поля input/textarea/select/number, indigo-600 focus ring
  - `PlaceholderInsert.vue` — три бейджа `{player}`, `{order_id}`, `{server}` с вставкой в активное поле через `selectionStart`/`selectionEnd`
- **Холст Vue Flow**:
  - `ActionCanvas.vue` — VueFlow + Background (Dots, адаптивный цвет под тему), поддержка drop из ActionPalette, пустое состояние с подсказкой, кнопка "+ Добавить действие", дважды связанное (v-model) состояние nodes/edges
- **Composable**:
  - `useActionConstructor.ts` — `nodesToJson()` рекурсивно обходит узлы в actionsJson-массив, `jsonToNodes()` создаёт Vue Flow-узлы с рассчитанными позициями, `createDefaultNode()`, `cloneNode()`, `getNodeHeight()`, `recalcPositions()`
- **Модалка конструктора**:
  - `ActionConstructor.vue` — модальное окно (z-50, max-w-5xl, 85vh, backdrop-blur) с ActionPalette слева и ActionCanvas справа. Футер: счётчик "Настроено N действий", кнопки Отмена/Сохранить. Escape-закрытие, автофокус контейнера. При открытии — jsonToNodes, при сохранении — nodesToJson → emit `update:modelValue`
- **Интеграция в CRUD товаров**:
  - `pages/dashboard/[id]/products.vue` — форма создания/редактирования товара переведена на табы «Основное» / «Действия». Таб «Действия» активен по умолчанию при создании. Вместо textarea для actionsJson — кнопка «Открыть конструктор действий» с модалкой ActionConstructor. Краткий список действий с иконками и счётчиком. Валидация: имя обязательно, цена ≥ 0, массив действий не пуст. JSON-сериализация при отправке на API

### Исправлено

- **`ActionCanvas.vue`** — удалены watch на `localNodes`/`localEdges`, эмитившие `update:nodes`/`update:edges` и создававшие круговую зависимость (`ActionCanvas` → `ActionConstructor` → `props` → `ActionCanvas` → ... → `Maximum recursive updates exceeded`). Состояние узлов теперь полностью локально, инициализация и сериализация — через `defineExpose({ initFromActions, getSerialized })` и template ref в `ActionConstructor`.
- **`ActionConstructor.vue`** — убрана передача `nodes`/`edges` как props, убраны обработчики `onUpdateNodes`/`onUpdateEdges`. `ActionCanvas` используется через `ref="canvasRef"`: на open — `canvasRef.initFromActions(modelValue)`, на save — `canvasRef.getSerialized()`.
- **`ActionCanvas.vue`** — добавлен `import ActionNode from './ActionNode.vue'` (в Nuxt 3 компоненты не автоимпортируются в `<script setup>` для JS-выражений). Исправлена ошибка `ReferenceError: ActionNode is not defined`.

---

## [0.6.1] — 2026-05-27

### Исправлено (code review: корректность, безопасность, производительность)

#### 🔴 TOCTOU в wallet.ts — race condition при выводе средств

- **`routes/wallet.ts` — `POST /withdraw`** — `wallet.balance` читался до `$transaction`, внутри транзакции использовалось устаревшее значение. Два параллельных запроса могли обойти проверку баланса.
  - Исправление: `prisma.wallet.findUnique` перенесён внутрь `$transaction`. Вся логика (поиск кошелька, агрегация pending-заявок, проверка баланса, создание WithdrawalRequest) выполняется в одной транзакции.

#### 🔴 Rate-limit на создание заказов

- **`routes/shop.ts` — `POST /order`** — эндпоинт не имел rate-limit, позволяя создать неограниченное количество заказов.
  - Исправление: добавлен `config: { rateLimit: { max: 10, timeWindow: '1 minute' } }`.

#### 🟡 Типизация: устранение `(req.params as any)`

- **Все 8 роутов** — повсеместное `(req.params as any).id` заменено на `req.params as RouteParams` с интерфейсом `{ id: string; [key: string]: string }`. В wallet.ts также добавлена Zod-схема для query-параметров транзакций вместо `as any`.

#### 🟡 Константы статусов заказов

- **Новый файл** `src/constants/order-status.ts` — `OrderStatus` (PENDING, PAID, DELIVERING, DELIVERED, FAILED, CANCELLED) с типом `OrderStatusType`.
- **Замена** во всех файлах: `src/routes/shop.ts`, `src/routes/plugin.ts`, `src/routes/admin.ts`, `src/routes/servers.ts`, `src/routes/stats.ts`. Строковые литералы `'paid'`, `'delivered'` и т.д. заменены на `OrderStatus.PAID`, `OrderStatus.DELIVERED`. Опечатки в статусах теперь отлавливаются TypeScript.

#### 🟡 Пагинация заказов

- **`routes/servers.ts` — `GET /orders`** — возвращал все заказы без `skip/take`. Добавлены query-параметры `page` (default 1) и `limit` (default 20, max 100) с Zod-валидацией. Ответ теперь содержит `{ items, pagination: { page, limit, total, pages } }`.

#### 🟡 Защита удаления сервера с активными заказами

- **`routes/servers.ts` — `DELETE /servers/:id`** — владелец мог удалить сервер с заказами в статусе `paid`/`delivering`, что приводило к потере заказов и невыплаченным средствам.
  - Исправление: перед удалением проверяется `order.count({ status: [PAID, DELIVERING] })`. При наличии активных заказов → 400 с сообщением.

#### 🟡 Лимит сессий на пользователя

- **`routes/auth.ts`** — пользователь мог создать неограниченное количество сессий, раздувая таблицу `UserSession`.
  - Исправление: добавлена функция `enforceMaxSessions(MAX_SESSIONS = 10)`. При превышении лимита удаляется самая старая сессия (по `createdAt`). Вызывается при login и register.

#### 🟢 Вынос бизнес-логики в services/

- **Новый файл** `src/services/order-service.ts` — функция `calculateCommission(totalAmount, commissionPct)`, возвращающая `{ commissionAmt, ownerAmount }`. Используется в `shop.ts` (создание заказа) и `plugin.ts` (complete-транзакция). Устранён дублирующийся расчёт комиссии.

#### 🟢 Строгий режим TypeScript

- **`tsconfig.json`** — добавлен `"noUnusedLocals": true`. Все неиспользуемые переменные удалены, включая `err` в catch-блоке DNS-верификации.

### Изменено

- `src/routes/plugin.ts` — добавлен `import crypto from 'node:crypto'` (явный импорт вместо глобального).
- `src/routes/servers.ts` — DNS-верификация больше не возвращает `err?.code` в ответе (потенциальная утечка информации). Ошибка скрыта за `'DNS lookup failed'`.
- `src/routes/plugin.ts` — функция `authenticatePlugin` типизирована через `FastifyRequest`/`FastifyReply` вместо `any`.

---

## [0.6.2] — 2026-05-27

### Исправлено (code review: фронтенд — безопасность, типизация, производительность)

#### 🔴 Безопасность

- **`server/api/[...].ts`** — proxy больше не возвращает `err.message` клиенту при ошибке (потенциальная утечка инфраструктуры). Заменён на `'Internal proxy error'`. Реальная ошибка логируется в `console.error`.
- **`components/ThemeToggle.vue`** — прямой доступ к `document`/`window`/`localStorage` обёрнут в `import.meta.client`. Устранён crash при SSR.
- **`stores/auth.ts`** — убрано сохранение `user` в `localStorage` (XSS-вектор). Данные пользователя хранятся только в Pinia (память). При инициализации приложения вызывается `GET /api/auth/me`. Функция `loadFromStorage()` больше не читает/пишет в `localStorage`. Глобальная инициализация `auth.initialize()` вынесена в `app.vue`.

#### 🟡 Типизация и качество кода

- **Новый файл** `types/admin.ts` — 7 интерфейсов (`AdminUser`, `AdminServer`, `AdminWithdrawal`, `AdminOrder`, `AdminTransaction`, `AdminStaff`, `PaginatedResponse`) с полной типизацией API-ответов.
- **9 файлов** `pages/admin/*` — `ref<any>` заменён на конкретные типы из `types/admin.ts`. Опечатки в полях данных теперь отлавливаются TypeScript.
- **`composables/useStaffCan.ts`** — удалена неиспользуемая функция `can()`.
- **`utils/status-constants.ts`** — новый файл с константами `OrderStatus` и `WithdrawalStatus` по аналогии с бэкендом.

#### 🟡 Производительность

- **`pages/admin/users.vue`, `pages/admin/servers.vue`** — debounce-таймеры поисковых инпутов теперь очищаются в `onUnmounted`. Устранён вызов `load()` на размонтированном компоненте.
- **`layouts/dashboard.vue`** — список серверов предоставляется через `provide('servers')`. Дочерняя страница `dashboard/[id]/index.vue` получает slug из inject вместо дублирующего `$fetch`.
- **`pages/dashboard/[id]/orders.vue`** — добавлена пагинация: `page`/`limit` параметры запроса и компонент `Pagination`. Бэкенд (v0.6.1) уже возвращал `{ items, pagination }`, но фронтенд игнорировал.

#### 🟡 Обработка ошибок

- **Все admin-страницы** — вместо `catch (e) { console.error(e) }` добавлена реактивная переменная `loadError`. При ошибке загрузки пользователь видит текст, а не пустую таблицу.
- **`middleware/auth.ts`, `middleware/admin.ts`** — заменён `auth.loadFromStorage()` на `auth.initialize()`. Асинхронная загрузка пользователя через API при перезагрузке страницы.

#### 🟢 Обработка дат и импорты

- **`composables/useWallet.ts`, `useTeam.ts`, `useServerStats.ts`** — удалены неиспользуемые `const auth = useAuthStore()`.
- **`pages/dashboard/[id]/team.vue`, `finance.vue`** — `new Date(...)` в шаблонах заменён на `fmtDate()`.
- **`pages/dashboard/[id]/finance.vue`** — удалён неиспользуемый `auth = useAuthStore()`.

### Изменено

- `middleware/auth.ts` — параметр `to` переименован в `_to` (unused param convention).
- Все admin-страницы используют `import type` из `~/types/admin` вместо `ref<any>`.

---

## [0.7.0] — 2026-05-28

### Добавлено

#### Личный кабинет пользователя (/profile)

- **Бэкенд** (`packages/api/src/routes/auth.ts`):
  - `GET /api/auth/sessions` — добавлено поле `isCurrent` в каждый элемент списка сессий
  - `POST /api/auth/change-password` — смена пароля с rate-limit 3 попытки / 5 мин. Проверка текущего пароля через `bcrypt.compare`. Атомарная смена пароля + удаление всех других сессий в `$transaction`
  - `DELETE /api/auth/sessions?all=true` — удаление всех сессий кроме текущей, с Zod-валидацией `z.enum(['true'])`
  - Экспортированы Zod-схемы `changePasswordSchema` и `deleteAllSessionsSchema` (доступны для тестов)

- **Фронтенд** (`packages/web`):
  - `types/index.ts` — добавлены интерфейсы `UserProfile` и `Session`
  - `pages/profile.vue` — страница настроек аккаунта (layout: default, middleware: auth, ssr: false)
  - `components/ProfileInfo.vue` — отображение id, email, даты регистрации
  - `components/ChangePassword.vue` — форма смены пароля с валидацией (8 символов, совпадение)
  - `components/SessionsList.vue` — список активных сессий с отметкой текущей, кнопками отзыва по одной и «Завершить все остальные»
  - `layouts/dashboard.vue` — добавлен пункт «Настройки аккаунта» с иконкой в сайдбаре
  - `nuxt.config.ts` — `/profile/**` добавлен в routeRules `{ ssr: false }`

- **Глобальный auto-logout при 401**:
  - `plugins/api-interceptor.client.ts` — перехват 401 на всех запросах (кроме `/api/auth/login` и `/api/auth/register`). При получении 401 очищается auth store и выполняется редирект на `/login`

#### Рефакторинг навигации: единый сайдбар

- **`layouts/app.vue`** — новый единый лейаут с боковым меню для всех авторизованных страниц
  - Разделы: Личный кабинет (`/profile`), Новости (`/news`), FAQ (`/faq`)
  - Блок «Мои серверы» со списком серверов, кнопкой создания, подсветкой активного
  - `ThemeToggle` и кнопка «Выйти» внизу
  - Мобильная версия: бургер-меню, название текущей страницы в топбаре
- **`layouts/dashboard.vue`** — удалён (функциональность перенесена в `app.vue`)
- **`pages/profile.vue`** — смена лейаута с `default` на `app`
- **`pages/dashboard/index.vue`**, **`pages/dashboard/[id].vue`** — смена лейаута с `dashboard` на `app`
- **`pages/news.vue`** — страница новостей с загрузкой из API (только published), список статей
- **`pages/faq.vue`** — страница FAQ с загрузкой из API, аккордеон-раскрытие вопросов
- **`nuxt.config.ts`** — `/news` и `/faq` добавлены в routeRules `{ ssr: false }`

#### Система новостей и FAQ (БД + API)

- **Prisma-схема** — добавлены модели `News` (id, title, content, published, createdAt, updatedAt) и `Faq` (id, question, answer, sortOrder, createdAt, updatedAt)
- **`routes/news.ts`** — публичные `GET /api/news` (published), `GET /api/news/:id`; admin `POST /api/news`, `PUT /api/news/:id`, `DELETE /api/news/:id`
- **`routes/faq.ts`** — публичный `GET /api/faq` (сортировка по sortOrder); admin `POST /api/faq`, `PUT /api/faq/:id`, `DELETE /api/faq/:id`
- **`routes/admin.ts`** — `GET /api/admin/news`, `GET /api/admin/faq` (все записи, включая черновики)
- **`pages/admin/news.vue`** — админ-страница: таблица (заголовок, дата, статус), модалка создания/редактирования, кнопки Ред./Уд.
- **`pages/admin/faq.vue`** — админ-страница: таблица (порядок, вопрос), модалка создания/редактирования, кнопки Ред./Уд.
- **`layouts/admin.vue`** — добавлены пункты меню «Новости» и «FAQ»
- **`types/index.ts`** — добавлены типы `NewsItem` и `FaqItem`

#### Корректировка финансов: зачисление на кошелёк при paid + индикатор невыданных заказов

- **`routes/shop.ts`** — при создании заказа со статусом `paid` теперь сразу зачисляется `ownerAmount` на кошелёк (balance) и создаётся транзакция `order_commission`. Обёрнуто в `$transaction`
- **`routes/plugin.ts`** — из хендлера `complete` удалено дублирующее зачисление на кошелёк (теперь оно происходит на этапе `paid`)
- **`routes/admin.ts`** — при отмене `paid`-заказа (`cancel`) — списание `ownerAmount` с кошелька и создание `refund`-транзакции в `$transaction`
- **`routes/stats.ts`** — добавлено поле `undeliveredOrders` (количество заказов в статусе `paid`, ожидающих выдачи)
- **`routes/wallet.ts`** — `totalEarned` теперь считается как `_sum.ownerAmount` из `Order` (paid + delivered), а не из `wallet.totalEarned`
- **`types/index.ts`** — `ServerStats` дополнен полем `undeliveredOrders`
- **`pages/dashboard/[id]/finance.vue`** — добавлен жёлтый баннер-предупреждение, если есть невыданные заказы: «N заказов оплачено, но ещё не выданы в игре»

#### Графики в админ-дашборде

- **`routes/admin.ts`** — `GET /api/admin/stats` расширен:
  - `registrationsByDay: { date, count }[]` — регистрации за 30 дней
  - `revenueByDay: { date, amount }[]` — доход по дням за 30 дней
  - `topServers: { id, name, game, revenue }[]` — топ-10 серверов по выручке
  - `ordersByStatus: { status, count }[]` — группировка заказов по статусу
  - `changes: { usersPct, serversPct, ordersPct, revenuePct }` — динамика сегодня vs вчера
- **`components/ChartCard.vue`** — компонент-обёртка для ApexCharts (area/bar/donut), авто-тёмная тема, SSR-safe через ClientOnly
- **`pages/admin/index.vue`** — 4 карточки статистики с индикаторами роста/падения + сетка 2×2 с графиками:
  1. Регистрации (area, indigo)
  2. Доход по дням (bar, emerald)
  3. Топ-10 серверов (bar, цвета по играм)
  4. Статусы заказов (donut)
- Установлены пакеты: `apexcharts`, `vue3-apexcharts`

#### Корректировка метрик в админке

- **`routes/admin.ts`** — `revenueToday` теперь считается как комиссия платформы (`_sum commissionAmt`), а не `totalAmount`. `totalVolume` — как сумма всех `order_commission` транзакций по всем кошелькам

### Исправлено

- **`routes/plugin.ts`** — удалён неиспользуемый импорт `calculateCommission`

### Тесты

- `tests/auth.test.ts` — 7 новых тестов (4 на changePasswordSchema, 3 на deleteAllSessionsSchema), в стиле существующих unit-тестов

---

## [0.8.0] — 2026-05-28

### Добавлено

#### Онбординг для новых владельцев серверов

- **Prisma-схема** — в модель `User` добавлено поле `onboardingCompleted Boolean @default(false)`
- **Бэкенд** (`routes/auth.ts`):
  - `GET /api/auth/me` — возвращает `onboardingCompleted` с авто-детекцией: если у пользователя есть сервер с товаром, поле автоматически устанавливается в `true`
  - `POST /api/auth/onboarding` — ручная установка `onboardingCompleted: true`
- **Фронтенд**:
  - `components/OnboardingWizard.vue` — 3-шаговый мастер (создание сервера → витрина + токен плагина → готово) с индикатором прогресса, автогенерацией slug, кнопкой «Пропустить»
  - `pages/dashboard/index.vue` — показ мастера если нет серверов и онбординг не завершён; после завершения редирект на дашборд сервера
  - `layouts/app.vue` — прогресс-бар «Настройка: 0/2 → 1/2» в сайдбаре под блоком «Мои серверы» (скрывается при `onboardingCompleted: true`)
- **Типы** — `User` расширен полем `onboardingCompleted: boolean`, `auth` store типизирован через `~/types`

---

## [0.9.0] — 2026-05-28

### Добавлено

#### Подписочная модель (SaaS-тариф)

- **Prisma-схема**:
  - Добавлен enum `PlanType` (`commission` | `subscription`)
  - Добавлен enum `SubscriptionStatus` (`active` | `cancelled` | `expired`)
  - В модель `Server` добавлены поля `planType` (default `commission`), `paymentKeys` (Json?)
  - В `PlatformSettings` добавлено поле `subscriptionPrice` (default 9.99)
  - Новая модель `Subscription`: id, serverId (unique), status, price, expiresAt, createdAt, updatedAt

- **Бэкенд** (`services/subscription-service.ts`):
  - `chargeSubscription(serverId, ownerId, price)` — пытается списать `price` с личного баланса (`User.balance`); если не хватает — пробует с кошелька витрины (`Wallet.balance`); возвращает `{ ok, from }`
  - `refundSubscription(subscriptionId)` — рассчитывает возврат за неиспользованные дни: `(price / 30) * дни`, зачисляет на `User.balance`, создаёт `correction`-транзакцию, отменяет подписку и переключает на `commission`. Если подписка уже истекла — возврат 0
  - `checkSubscriptionExpiry(serverId)` — проверяет истекшую подписку и запускает авто-продление
  - `runSubscriptionRenewals()` — массовая проверка всех истекших подписок
  - Бесплатный триал **удалён** — оплата списывается сразу при создании или переходе на подписку

- **Бэкенд** (`routes/auth.ts`):
  - `GET /api/auth/me` — возвращает `balance` пользователя

- **Бэкенд** (`routes/wallet.ts`):
  - `GET /api/user/balance` — возвращает `personalBalance` (личный), `serverBalance` (сумма по кошелькам), `totalEarned`
  - `POST /api/user/balance/deposit` — пополнение личного баланса (самостоятельно)

- **Prisma-схема**:
  - В модель `User` добавлено поле `balance Float @default(0)` — личный баланс для оплаты подписок

- **Бэкенд** (`index.ts`):
  - При старте и каждые 30 минут запускается `runSubscriptionRenewals()`

- **Бэкенд** (`routes/servers.ts`):
  - `POST /api/servers` — добавлен `planType` в Zod-схему; при `planType: subscription` создаёт сервер как commission, пытается списать оплату; при успехе активирует подписку, при неудаче оставляет на commission
  - `PATCH /api/servers/:id` — добавлен `planType` в схему обновления; при переключении на subscription — мгновенное списание, при неудаче — 400 с сообщением; при переключении на commission — возврат пропорциональной суммы за неиспользованные дни на `User.balance`
  - `GET /api/servers/:id` — возвращает `subscription` с включением; проверяет истекшие подписки
  - `GET /api/servers/:id/payment-keys` — возвращает ключи платёжной системы (с маскировкой secret)
  - `PUT /api/servers/:id/payment-keys` — сохранение ключей (provider, publicKey, secret, extra)
  - `GET /api/servers/:id/subscription` — информация о подписке для владельца

- **Бэкенд** (`routes/shop.ts`):
  - `POST /api/shop/:slug/order` — при `planType: subscription` комиссия не взимается (commissionPct = 0, ownerAmount = 0), баланс кошелька не пополняется, транзакция не создаётся. Деньги идут напрямую владельцу через его платёжные ключи.

- **Бэкенд** (`routes/wallet.ts`):
  - `POST /api/servers/:id/withdraw` — 403 при `planType: subscription` с сообщением о недоступности вывода

- **Бэкенд** (`routes/admin.ts`):
  - `GET /api/admin/servers` — добавлены `planType` и `subscription { id, status, expiresAt }` в ответ
  - `POST /api/admin/subscriptions/:id/extend` — продление подписки (новый expiresAt)
  - `POST /api/admin/subscriptions/:id/cancel` — отмена подписки + переключение на `commission` + возврат за неиспользованные дни
  - `PUT /api/admin/settings` — добавлено поле `subscriptionPrice`
  - `POST /api/admin/user/balance/deposit` — пополнение личного баланса пользователя (ADMIN/FINANCE)

- **Фронтенд**:
  - `types/index.ts` — `User` расширен полем `balance`; `Server` расширен полями `planType`, `paymentKeys`, `subscription`; новый тип `SubscriptionInfo`
  - `types/admin.ts` — `AdminServer` расширен полями `planType`, `subscription`
  - `layouts/app.vue` — в сайдбаре под email добавлен блок «Баланс: $X.XX» с данными из `auth.user.balance`
  - `pages/dashboard/[id]/settings.vue` — выбор тарифного плана (комиссия/подписка), отображение статуса подписки с датой окончания; при переключении на комиссию — модалка подтверждения с суммой возврата, отображение возвращённой суммы после сохранения
  - `pages/dashboard/[id]/payments.vue` — управление ключами платёжной системы (доступно только при subscription)
  - `pages/dashboard/[id].vue` — добавлены вкладки «Платёжные системы» и «Настройки»
  - `pages/dashboard/[id]/finance.vue` — баннер о подписочной модели; скрыты кнопка «Вывести средства» и блок «Заявки на вывод» при `planType: subscription`
  - `pages/dashboard/[id]/index.vue` — баннер «Подписка истекла. Вы на комиссии» с ссылкой на продление
  - `pages/admin/servers.vue` — колонка «План» (Комиссия/Подписка), модалка управления подпиской (продление/отмена)

---

## [0.9.1] — 2026-05-28

### Добавлено

#### Детальная страница заказа

- **Бэкенд** (`routes/servers.ts`):
  - `GET /api/servers/:id/orders/:orderId` — детальная информация о заказе для владельца (включая product, deliveryAttempts). Поддерживается доступ через участников команды
  - `POST /api/servers/:id/orders/:orderId/cancel` — отмена заказа владельцем (только для статусов paid/delivering)
  - `POST /api/servers/:id/orders/:orderId/retry` — повтор доставки для failed-заказа (сброс статуса на paid, обнуление retryCount и lastError)
- **Бэкенд** (`routes/admin.ts`):
  - `GET /api/admin/orders/:id` — детальная информация о любом заказе для админа (включая product, server, deliveryAttempts)
- **Типы** (`types/index.ts`, `types/admin.ts`):
  - Добавлены интерфейсы `OrderDetail`, `DeliveryAttemptItem`, `AdminOrderDetail`, `AdminDeliveryAttemptItem`
- **Фронтенд** (`pages/dashboard/[id]/orders/[orderId].vue`):
  - 4 блока: информация о заказе (ID, товар, игрок, сумма, комиссия, доход, статус, дата), хронология (визуальная временная шкала с иконками), действия (аккордеон с парсингом committedActions), управление (отмена/повтор доставки)
- **Фронтенд** (`pages/admin/orders/[id].vue`):
  - Та же структура, layout admin + название сервера в шапке
- **Фронтенд** (`pages/admin/orders/index.vue`, `pages/dashboard/[id]/orders/index.vue`):
  - ID заказа в таблицах теперь кликабельная ссылка на детальную страницу
- **Реструктуризация роутинга**: файлы `orders.vue` перенесены в `orders/index.vue` для устранения конфликта с поддиректорией `orders/[id]`

#### Промокоды и топ донатеров

- **Prisma-схема**:
  - Добавлена модель `Coupon` (id, serverId, code, discountType (percentage|fixed), discountValue, usageLimit, usedCount, expiresAt, isActive) с unique-индексом `@@unique([serverId, code])`
  - Добавлен enum `DiscountType` (percentage, fixed)
  - В модель `Order` добавлено поле `couponCode` (String, optional)
- **Бэкенд** (`routes/servers.ts`):
  - `GET /api/servers/:id/coupons` — список купонов сервера с пагинацией
  - `POST /api/servers/:id/coupons` — создание купона (Zod: code 3-20 символов, discountType, discountValue, опционально usageLimit/expiresAt)
  - `PATCH /api/servers/:id/coupons/:couponId` — обновление (isActive, usageLimit, expiresAt)
  - `DELETE /api/servers/:id/coupons/:couponId` — удаление
- **Бэкенд** (`routes/shop.ts`):
  - `POST /api/shop/:slug/validate-coupon` — публичная проверка купона: валидация isActive, expiresAt, usageLimit; возвращает discountType, discountValue, discountedPrice
  - `GET /api/shop/:slug/top-donators` — публичный топ донатеров: groupBy playerName по заказам со статусами paid/delivering/delivered, фильтр по периоду (week|month|all), сортировка по сумме
  - `POST /api/shop/:slug/order` — добавлен опциональный `couponCode`; валидация купона и пересчёт totalAmount со скидкой; инкремент usedCount в $transaction
- **Фронтенд** (`types/index.ts`):
  - Добавлены интерфейсы `Coupon` и `TopDonator`
  - `Order` расширен полем `couponCode`
- **Фронтенд** (`pages/dashboard/[id]/coupons.vue`):
  - Новая вкладка в дашборде: таблица купонов (код, скидка, использовано/лимит, статус, истекает), модалка создания, кнопки деактивировать/удалить
  - Вкладка добавлена в навигацию `pages/dashboard/[id].vue`
- **Фронтенд** (`pages/shop/[slug].vue`):
  - Боковая панель: поле ввода промокода с кнопкой «Применить» и отображением статуса
  - При успешном применении: зачёркнутая старая цена и зелёная новая на карточке товара и в модалке
            - Блок «Топ донатеров»: выбор периода (Неделя/Месяц/Всё время), список с медалями 🥇🥈🥉, пустое состояние

#### Управление запасами (stock) для товаров

- **Prisma-схема** — в модель `Product` добавлено поле `stock` (Int, nullable)
- **Бэкенд** (`routes/servers.ts`):
  - `POST /api/servers/:id/products` — добавлен `stock` (optional, Int, min 0) в Zod
  - `PATCH /api/servers/:id/products/:productId` — добавлен `stock` в Zod
  - `PUT /api/servers/:id/products/:productId/restock` — новый эндпоинт для пополнения запаса
- **Бэкенд** (`routes/shop.ts`):
  - `GET /api/shop/:slug` — товары с `stock === 0` возвращаются с флагом `soldOut: true`
  - `POST /api/shop/:slug/order` — в `$transaction` добавлена проверка stock и `decrement: 1` для товаров с лимитом; защита от race condition
- **Бэкенд** (`routes/stats.ts`):
  - В ответ добавлено `outOfStockProducts` — количество товаров с `stock: 0`
- **Типы** (`types/index.ts`):
  - `Product` расширен полем `stock: number | null` и `soldOut?: boolean`
  - `ServerStats` расширен полем `outOfStockProducts: number`
- **Фронтенд** (`pages/dashboard/[id]/products.vue`):
  - В карточке товара: индикатор остатка (число / ∞ / «Нет в наличии»)
  - В форме: поле «Ограничение запаса» (пусто = безлимит)
  - Кнопка «Пополнить» → модалка с числовым полем
- **Фронтенд** (`pages/dashboard/[id]/index.vue`):
  - Жёлтый баннер при `outOfStockProducts > 0` со ссылкой на пополнение
- **Фронтенд** (`pages/shop/[slug].vue`):
  - Бейдж «Распродано» на карточке, кнопка «Купить» → «Нет в наличии» (disabled)
  - Бейдж «Осталось N шт.» при stock от 1 до 5

---

## [0.9.2] — 2026-05-28

### Исправлено (code review: безопасность и целостность данных)

#### 🔴 Критические баги — 7 шт

- **`routes/shop.ts` — Coupon TOCTOU** — валидация купона перенесена внутрь `$transaction`. Инкремент `usedCount` через атомарный `updateMany` с guard-условиями (`isActive: true`, `expiresAt > now`, `usedCount < usageLimit`). При `count === 0` — купон недействителен.
- **`routes/shop.ts` — Stock race condition** — проверка и декремент `stock` заменены с `findUnique` + `update({ decrement })` на `updateMany({ where: { stock: { gt: 0 } } })`. При `count === 0` — распродано.
- **`routes/shop.ts` — Wallet balance TOCTOU** — зачисление `ownerAmount` заменено с `balance: wallet.balance + ownerAmount` на атомарный `balance: { increment: ownerAmount }`.
- **`routes/servers.ts` — Отмена заказа** — добавлено восстановление `stock` (+1), декремент `coupon.usedCount` (при наличии), списание `ownerAmount` с кошелька и refund-транзакция. Всё в одном `$transaction`.
- **`services/subscription-service.ts` + `routes/servers.ts` — Неатомарная подписка** — `chargeSubscription()` теперь принимает опциональный `tx` (Prisma.TransactionClient). Создание сервера с подпиской: `chargeSubscription` + `subscription.create` + `server.update` — в одном `$transaction`. Смена тарифа на subscription — аналогично. Баланс списывается через атомарный `updateMany({ where: { balance: { gte: price } } })`.
- **`routes/admin.ts` — Double-approve выплаты** — `findUnique` перенесён внутрь `$transaction`. Проверка статуса `pending` внутри транзакции. При ошибке атомарного конкурентного доступа — понятное сообщение.
- **`plugins/auth.ts` — lastUsedAt сессии** — после проверки сессии в `authenticate` preHandler добавлено асинхронное `prisma.userSession.update({ data: { lastUsedAt: new Date() } })` с `.catch(() => {})`. Сессии всегда свежие.
- **`routes/servers.ts` — Zod на PATCH orders** — ручная проверка `req.body.status` заменена на `z.object({ status: z.enum(['paid', 'cancelled']) })` с `safeParse`.

### Исправлено (code review: качество кода и производительность)

#### 🟡 Индексы БД

- **Prisma-схема** — добавлены индексы:
  - `Order.couponCode` — `@@index([couponCode])`
  - `Order.playerName` — `@@index([playerName])`
  - `Product.stock` — `@@index([stock])`
  - `UserSession.lastUsedAt` — `@@index([lastUsedAt])`

#### 🟡 CORS conditional

- **`index.ts`** — `origin: true` заменён на conditional: в `NODE_ENV=production` берётся из `CORS_ORIGIN` env или `https://${baseDomain}`, иначе `true`.

#### 🟡 paymentKeys leak

- **`routes/servers.ts` — `GET /api/servers`** — добавлено `omit: { paymentKeys: true }`. Платёжные ключи больше не утекают в ответ.

#### 🟡 alert() → инлайн-ошибки (11 мест)

- **9 файлов** — все `alert(...)` заменены на реактивные `ref` + `<p>`-элементы в шаблонах модальных окон. Файлы: `layouts/app.vue`, `pages/dashboard/index.vue`, `pages/admin/faq.vue`, `pages/admin/news.vue`, `pages/admin/staff.vue`, `pages/admin/users.vue`, `pages/admin/users/[id].vue`, `pages/dashboard/[id]/domain.vue`. В faq/news/staff/users модалках ошибки очищаются при открытии/закрытии форм.

#### 🟡 ChartCard reactive theme

- **`components/ChartCard.vue`** — `isDark` теперь реактивно отслеживает смену темы через `MutationObserver` на `documentElement.classList` (вместо одноразового чтения `localStorage` в `onMounted`). Удалена мёртвая функция `syncTheme()`. Observer очищается в `onUnmounted`.

#### 🟡 SSR-guards

- **`components/OnboardingWizard.vue`** — `window.location.origin` заменён на `useRequestURL().origin` (SSR-safe).
- **`components/PlaceholderInsert.vue`** — `document.activeElement` обёрнут в `if (import.meta.client)`.

#### 🟡 `fmtDate` locale

- **`utils/format.ts`** — `toLocaleDateString()` → `toLocaleDateString('ru-RU')`. Устранён hydration-mismatch между серверной и клиентской локалью.

#### 🟡 OrderStatus enum на фронтенде

- **5 файлов** — строковые литералы `'paid'`, `'pending'`, `'delivering'`, `'failed'` заменены на `OrderStatus.PAID` и т.д. Файлы: `pages/dashboard/[id]/orders/[orderId].vue`, `pages/admin/orders/index.vue`, `pages/admin/orders/[id].vue`, `pages/admin/withdrawals.vue`.

#### 🟡 Wallet route: withdraw balance

- **`routes/wallet.ts` — `POST /withdraw`** — атомарная проверка баланса внутри `$transaction`: `updateMany({ where: { balance: { gte: requiredAmount } } })`. Защита от одновременных заявок.

#### 🟡 FlowController: 16 as any → 0

- **`components/FlowController.vue`** — все `as any` касты заменены на импортированный тип `Node` из `@vue-flow/core`. 0 `as any` в компоненте.

#### 🟡 `(req as any)` в plugin.ts

- **`routes/plugin.ts`** — `(req as any).pluginToken = ...` заменён на типизированное `req.pluginToken = { server: { ... } }`.

#### 🟡 `chargeSubscription` error logging

- **`services/subscription-service.ts`** — в catch блоке добавлен `console.error('[chargeSubscription] failed for server', serverId)`. Ошибки БД больше неотличимы от недостатка средств.

#### 🟡 Купоны case-insensitive

- **`routes/shop.ts`** — `couponCode` в `createOrderSchema` и `validateCouponSchema` трансформируется в `upperCase()` через `.transform()`. В `routes/servers.ts` — код купона при создании форсируется в `toUpperCase()`.

#### 🟡 PaymentKeys typing

- **`types/index.ts`** — добавлен интерфейс `PaymentKeys { provider, secret?, publicKey?, extra? }`. `Server.paymentKeys` типизирован как `PaymentKeys | null` вместо `Record<string, any>`.

#### 🟡 Пустые catch → console.error

- **`stores/auth.ts`** — `catch {}` в `logout()` заменён на `catch { console.error('Logout request failed') }`.

#### 🟡 Онбординг-бар: область видимости

- **`layouts/app.vue`** — прогресс-бар «Настройка: N/2» теперь показывается только на `/dashboard` роутах (добавлен `route.path.startsWith('/dashboard')` в `v-if`).

#### 🟡 `ServerStats` дубликат

- **`types/index.ts`** — удалён повторный интерфейс `ServerStats` (был объявлен дважды).

#### 🟡 `updatedAt` на ключевых моделях

- **Prisma-схема** — добавлено поле `updatedAt DateTime @updatedAt` в модели `User`, `Server`, `Product`, `Order`. Колонки добавлены через прямой SQL (`ALTER TABLE ADD COLUMN`), затем синхронизированы через `prisma db push`.

#### 🟡 `authStaff` без дублирования `authenticate`

- **`plugins/platformStaff.ts`** — из `authStaff` убраны JWT-верификация, проверка сессии и бана (они в `authenticate`). `authStaff` теперь только ищет `PlatformStaff` запись. Все 33 админ-роута обновлены с `{ preHandler: [app.authStaff] }` на `{ preHandler: [app.authenticate, app.authStaff] }`.

### Добавлено

#### Страница пополнения личного баланса

- **Prisma-схема** — новая модель `Deposit` (id, userId, amount, method, createdAt). Индекс `@@index([userId, createdAt])`.
- **`routes/wallet.ts`**:
  - `POST /api/user/balance/deposit` — Zod `{ amount: z.number().min(100).max(50000), method: z.enum(['card', 'yoomoney']) }`. Пополнение баланса + создание Deposit-записи в `$transaction`.
  - `GET /api/user/balance/transactions` — пагинированная история пополнений с сортировкой по дате.
- **Фронтенд**:
  - `types/index.ts` — интерфейс `DepositTransaction { id, amount, method, createdAt }`
  - `pages/profile/balance.vue` — новая страница (layout: app, middleware: auth). Текущий баланс из `auth.user.balance`, форма пополнения (сумма 100-50000 ₽, способ: карта/ЮMoney), сообщение об успехе/ошибке, таблица истории пополнений с пагинацией.
  - `layouts/app.vue` — баланс в сайдбаре стал кликабельным (`<NuxtLink to="/profile/balance">`), валюта `₽` вместо `$`.
  - `pages/profile.vue` — добавлена карточка «Пополнение баланса» со ссылкой на `/profile/balance`.

### Тесты

- **71/71** тестов пройдены.
- **API typecheck** (`tsc --noEmit`): 0 ошибок.

### Исправлено

- **`pages/profile.vue` → `pages/profile/index.vue`** — leaf-страница блокировала дочерние маршруты. Перенесена в `index.vue`, чтобы `pages/profile/balance.vue` рендерился по `/profile/balance`.

---

## [0.9.3] — 2026-05-28

### Добавлено

#### Система тикетов (техподдержка) с Long Polling

- **Prisma-схема**:
  - Добавлены enums `TicketStatus` (open, answered, closed), `TicketPriority` (low, medium, high)
  - Новая модель `Ticket`: id (UUID), userId (FK User), serverId (FK Server, optional), subject, status, priority, createdAt, updatedAt. Индексы: `@@index([userId])`, `@@index([status])`, `@@index([updatedAt])`
  - Новая модель `TicketMessage`: id (UUID), ticketId (FK Ticket), userId (FK User), message (Text), isStaff (Boolean), createdAt. Индексы: `@@index([ticketId])`, `@@index([createdAt])`
  - User дополнен полями `tickets Ticket[]`, `ticketMessages TicketMessage[]`
  - Server дополнен полем `tickets Ticket[]`

- **Бэкенд** (`routes/tickets.ts`):
  - `GET /api/tickets` — список тикетов пользователя, фильтр по статусу, сортировка updatedAt desc, пагинация
  - `POST /api/tickets` — создать тикет + первое сообщение в `$transaction`. Zod: `{ subject: z.string().min(5).max(200), message: z.string().min(10), serverId, priority }`
  - `GET /api/tickets/:id` — тикет + сообщения (asc, с `user.email`). Проверка доступа: автор или админ
  - `POST /api/tickets/:id/messages` — ответ в тикет. Если closed → 400. Обновление updatedAt. Авто-перевод open → answered при ответе админа. Возвращает сообщение с `user.email`
  - `PATCH /api/tickets/:id/close` — закрыть тикет (автор или админ)
  - `GET /api/tickets/:id/poll` — long polling. Query: `since` (ID последнего сообщения). Проверка БД каждые 2 сек, таймаут 30 сек. EventEmitter для мгновенного пробуждения при новом сообщении. Новые сообщения → `{ messages: [...] }`, таймаут → `{ messages: [], timeout: true }`, закрыт → `{ messages: [], closed: true }`
  - `GET /api/admin/tickets` — все тикеты, фильтры status/priority/serverId/search, пагинация. Ответ включает `user.email`, `server.name`, `_count.messages`
  - `POST /api/admin/tickets/:id/messages` — ответ админа (`isStaff: true`), авто-перевод open → answered
  - `PATCH /api/admin/tickets/:id` — смена status / priority. Zod: `{ status, priority }` оба optional

- **Валидаторы** (`validators/tickets.ts`):
  - `createTicketSchema` — `{ subject, message, serverId?, priority? }`
  - `ticketMessageSchema` — `{ message }`
  - `updateTicketSchema` — `{ status?, priority? }`

- **Фронтенд** (`pages/tickets/index.vue`) — таблица тикетов: тема, статус (бейдж), приоритет (бейдж), сервер, дата. Фильтр по статусу, кнопка «Создать тикет» → модалка создания

- **Фронтенд** (`pages/tickets/[id].vue`) — чат переписки:
  - Шапка: тема, статус, приоритет, сервер
  - Сообщения: пользователь справа (синий), поддержка слева (серый). Метки «Вы»/«Поддержка» над каждым сообщением
  - Форма ответа внизу, кнопка «Закрыть тикет»
  - Long polling через `useTicketPolling`

- **Фронтенд** (`pages/admin/tickets/index.vue`) — админ-таблица: все тикеты, фильтры status/priority, поиск по теме, пагинация

- **Фронтенд** (`pages/admin/tickets/[id].vue`) — админ-чат:
  - Сообщения: пользователь слева (серый, метка email), админ справа (красный, метка «Вы»)
  - Селекты смены статуса и приоритета в шапке с мгновенным применением
  - Форма ответа

- **Composable** (`composables/useTicketPolling.ts`):
  - Принимает `ticketId`, `lastMessageId` (Ref)
  - Рекурсивный опрос `GET /api/tickets/:id/poll?since=...`
  - При timeout → сразу новый запрос
  - При новых сообщениях → добавление в список, обновление lastMessageId
  - При закрытии → остановка
  - Остановка на `onUnmounted`
  - Обработка ошибок сети → реконнект через 5 сек

- **Типы** (`types/index.ts`): `Ticket`, `TicketMessage` с полем `user?: { email: string }`
- **Типы** (`types/admin.ts`): `AdminTicket` (с `user`, `server`, `_count.messages`)

- **Сайдбар** (`layouts/app.vue`) — добавлен пункт «Поддержка» с иконкой чата
- **Сайдбар** (`layouts/admin.vue`) — добавлен пункт «Тикеты»

- **Конфиг** (`nuxt.config.ts`) — `/tickets` и `/tickets/**` добавлены в routeRules `{ ssr: false }` (как все авторизованные страницы)

### Исправлено

- **Leaf-route блокировка** — `pages/tickets.vue` → `pages/tickets/index.vue`, `pages/admin/tickets.vue` → `pages/admin/tickets/index.vue`. Leaf-страница блокировала дочерний маршрут `[id].vue`, как ранее было с `profile.vue` → `profile/index.vue`
- **SSR на /tickets** — добавлены правила `{ ssr: false }` в nuxt.config.ts. Без них кука не пробрасывалась через proxy при SSR, и middleware отправлял на /login

### Модели (19 таблиц)

+Ticket, +TicketMessage

### Тесты

- 71/71 тестов пройдены
- API typecheck (tsc --noEmit): 0 ошибок

---

## [0.9.4] — 2026-05-28

### Изменено

#### Float → Decimal для денежных полей (Prisma)
- Все денежные поля (15 шт. в 8 моделях) заменены с `Float` на `Decimal` с `@db.Decimal(10, 2)`:
  `User.balance`, `Deposit.amount`, `Subscription.price`, `Product.price`, `Coupon.discountValue`,
  `Order.totalAmount`/`commissionAmt`/`ownerAmount`, `Wallet.balance`/`totalEarned`,
  `Transaction.amount`, `WithdrawalRequest.amount`, `PlatformSettings.subscriptionPrice`
- `plugins/prisma.ts` — добавлен `$extends` с авто-конвертацией `Prisma.Decimal → number` на всех чтениях через `query.$allOperations` + `convertDecimals()`

#### totalAmount читается внутри $transaction
- `routes/shop.ts` — цена товара (`freshProduct`) читается внутри `$transaction` через `tx.product.findUnique`, а не снаружи. Купонная скидка и комиссия рассчитываются от актуальной цены.

#### Миграция $fetch → useApi()
- `composables/useWallet.ts`, `useTeam.ts`, `useServerStats.ts` — `$fetch` заменён на `useApi()` (базовый URL `/api`, `credentials: 'include'`)
- `layouts/app.vue`, `layouts/admin.vue` — переход на `useApi()` для всех запросов
- `pages/tickets/index.vue`, `pages/tickets/[id].vue` — переход на `useApi()`
- `pages/dashboard/[id].vue` — переход на `useApi()`

#### Дублирующие fetch сервера в dashboard → provide/inject
- `pages/dashboard/[id].vue` — после загрузки сервера делает `provide('currentServer', server)`
- `pages/dashboard/[id]/index.vue` — использует `inject('currentServer')` вместо отдельного `$fetch`
- `pages/dashboard/[id]/finance.vue` — использует `inject('currentServer')` для `planType`
- `pages/dashboard/[id]/domain.vue` — использует `inject('currentServer')` как fallback, при отсутствии — загружает самостоятельно

#### Вынос общей логики заказа в useOrderDetail.ts
- **Новый файл** `composables/useOrderDetail.ts` — функции `fmtDateTime`, `timelineIcon`, `timelineSvg`, `actionIcon`, `actionLabel`, `formatAction`, `buildTimeline`, `parseActions`
- `pages/dashboard/[id]/orders/[orderId].vue` — удалены все дублирующие функции, используется `useOrderDetail()`
- `pages/admin/orders/[id].vue` — удалены все дублирующие функции, используется `useOrderDetail()`

### Исправлено

- **Витрина (`pages/shop/[slug].vue`)** — в модалке покупки показывались две одинаковые суммы, когда не активны ни доплата, ни промокод. Причина: `v-if="currentPrice"` (всегда true) вместо `v-if="useUpgrade || appliedCoupon"`.

### Тесты

- 71/71 тестов пройдены
- API typecheck (tsc --noEmit): 0 ошибок

---

## [0.9.5] — 2026-05-28

### Добавлено

#### Email-система, подтверждение email и восстановление пароля

- **Prisma-схема**:
  - Добавлен enum `EmailVerificationType` (email_verify, password_reset)
  - Новая модель `EmailVerification`: id, userId (FK User), token (unique), type, expiresAt, createdAt. `@@unique([userId, type])`
  - В модель `User` добавлено поле `emailVerified` (Boolean, default false)
  - User дополнен отношением `emailVerifications EmailVerification[]`

- **Бэкенд** (`services/email-service.ts`):
  - `sendEmail(to, subject, html)` — абстракция над nodemailer
  - На dev: Ethereal (тестовый SMTP-аккаунт создаётся автоматически)
  - На prod: переменные окружения `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `EMAIL_SECURE`
  - `sendVerificationEmail(user, token)` — письмо с ссылкой на `/api/auth/verify-email?token=`
  - `sendPasswordResetEmail(user, token)` — письмо с ссылкой на `/reset-password?token=`

- **Бэкенд** (`routes/auth.ts`):
  - `POST /api/auth/register` — после создания пользователя генерируется токен, создаётся EmailVerification, отправляется письмо. Ответ: `{ message }` (без авто-входа)
  - `POST /api/auth/login` — возвращает `emailVerified` в ответе
  - `GET /api/auth/me` — возвращает `emailVerified`
  - `GET /api/auth/verify-email?token=` — публичный эндпоинт: проверяет токен, устанавливает `emailVerified: true`, удаляет токен, редиректит на `/login?verified=true|expired`
  - `POST /api/auth/resend-verification` (authenticate, rate-limit 3/15min) — удаляет старый токен, создаёт новый, отправляет письмо повторно
  - `POST /api/auth/forgot-password` (rate-limit 3/15min) — всегда возвращает `{ message }` (защита от перебора email). Если пользователь найден — создаёт токен password_reset (+1h), отправляет письмо
  - `POST /api/auth/reset-password` (rate-limit 3/15min) — проверяет токен, обновляет пароль, удаляет ВСЕ сессии пользователя, удаляет токен

- **Фронтенд**:
  - `types/index.ts` — `User` расширен полем `emailVerified: boolean`
  - `components/AppBanner.vue` — переиспользуемый баннер (warning/success) с кнопкой закрытия
  - `pages/forgot-password.vue` — форма ввода email, после отправки — сообщение
  - `pages/reset-password.vue` — форма нового пароля с подтверждением, query-параметр `token`
  - `pages/login.vue` — баннер подтверждения email (`?verified=true`), ссылка «Забыли пароль?»
  - `pages/register.vue` — после регистрации: сообщение «На ваш email отправлена ссылка» вместо авто-входа
  - `layouts/app.vue` — жёлтый баннер «Подтвердите ваш email» с кнопкой повторной отправки
  - `nuxt.config.ts` — `/forgot-password`, `/reset-password` добавлены в routeRules `{ ssr: false }`

### Исправлено

#### 🔴 Prisma-плагин: convertDecimals уничтожал Date-объекты

- `plugins/prisma.ts` — функция `convertDecimals` обрабатывала `Date` как `typeof === 'object'`, превращая его в плоский объект без прототипных методов (`.toISOString()`, `.getTime()`). Это вызывало 500 на любом эндпоинте, читающем даты из БД (включая `/api/servers/:id/stats`).
- Исправление: добавлена проверка `if (obj instanceof Date) return obj;` перед обработкой объекта.

#### 🔴 provide() после await в async onMounted

- `pages/dashboard/[id].vue` — вызов `provide('currentServer', s)` внутри `async onMounted` после `await` приводил к предупреждению `provide() can only be used inside setup()`.
- Исправление: удалён дублирующий `provide` (строка 76 уже предоставляет реактивный ref). Значение ref обновляется через `server.value = s`.

#### 🟡 Мёртвый inject('servers') в dashboard overview

- `pages/dashboard/[id]/index.vue` — `inject('servers')` использовал ключ, который нигде не предоставлялся, всегда падая на `ref([])`.
- Исправление: заменён на `inject<Ref<Server | null>>('currentServer', ref(null))`, который предоставляется родительским `[id].vue`.

#### 🟡 Race condition в inject('currentServer') на dashboard

- `pages/dashboard/[id]/index.vue` — дублирующий `inject('currentServer')` с `unref()` в `onMounted` заменён на прямое чтение ранее инжектированного ref `currentServer.value`.

#### 🟡 inject() после await в finance.vue и domain.vue

- `pages/dashboard/[id]/finance.vue` — `inject('currentServer')` вызывался в `onMounted` после `await`, что приводило к предупреждению `inject() can only be used inside setup()`.
- `pages/dashboard/[id]/domain.vue` — `inject('currentServer')` вызывался внутри `async function loadServer()`.
- Исправление: `inject` вынесен на верхний уровень `<script setup>` в обоих файлах, значения читаются через `.value`.

### Добавлено

- `routes/stats.ts` — `try/catch` с `req.log.error(err, 'Stats error')` для диагностики 500.

### Тесты

- 71/71 тестов пройдены

---

## [0.10.0] — 2026-05-28

### Добавлено

#### Система доплаты (upgrade) для товаров

- **Prisma-схема**:
  - В модель `Product` добавлены поля: `upgradeProductId` (self-FK, String?, onDelete: SetNull), `upgradeEnabled` (Boolean, default false). Самореференция через `@relation("ProductUpgrade")` с обратной связью `upgradeFor`
  - В модель `Server` добавлено поле `upgradeEnabled` (Boolean, default true) — глобальное включение опции

- **Бэкенд** (`routes/servers.ts`):
  - `POST /api/servers/:id/products` — Zod-схема дополнена `upgradeProductId` (uuid, optional) и `upgradeEnabled` (boolean, optional). Валидация: родитель существует на том же сервере и дешевле (иначе 400)
  - `PATCH /api/servers/:id/products/:productId` — те же поля с nullable для `upgradeProductId`. Аналогичная валидация с fallback на текущую цену товара
  - `PATCH /api/servers/:id` — Zod-схема дополнена `upgradeEnabled` (boolean, optional)

- **Бэкенд** (`routes/shop.ts`):
  - `GET /api/shop/:slug` — для товаров с `upgradeEnabled: true` и сервером `upgradeEnabled: true` в ответе возвращаются `upgradeProduct: { id, name, price }` и `upgradePrice` (разница цен). Родительский товар загружается через `include: { upgradeProduct }`
  - `POST /api/shop/:slug/order` — добавлен `upgrade: boolean` в Zod. В `$transaction`: если `upgrade: true`, проверяется доступность опции (сервер, товар, parent), затем `totalAmount = price(child) - price(parent)`. При `totalAmount <= 0` — ошибка

- **Типы** (`types/index.ts`):
  - `Product` расширен полями `upgradeProductId`, `upgradeEnabled`, `upgradeProduct`, `upgradePrice`
  - `Server` расширен полем `upgradeEnabled`

- **Фронтенд** (`pages/dashboard/[id]/products.vue`):
  - Третья вкладка «Доплата» с селектом товаров сервера (исключая себя при редактировании) и чекбоксом «Показывать опцию доплаты на витрине»
  - Отображение информации о родителе: цена, разница, валидация «Родительский товар должен быть дешевле»
  - `upgradeProductId` отправляется на POST только при выборе, на PATCH — всегда (null для сброса)

- **Фронтенд** (`pages/dashboard/[id]/settings.vue`):
  - Toggle-переключатель «Доплата (upgrade)» с автосохранением через `watch` + `loaded` guard (чтобы избежать лишнего PATCH при загрузке)

- **Фронтенд** (`pages/shop/[slug].vue`):
  - На карточке товара с доплатой: отображается upgradePrice и зачёркнутая полная цена
  - В модалке покупки: чекбокс «У вас есть [родитель]? Доплатите всего $X вместо $Y» с пересчётом `currentPrice`
  - При выборе доплаты в заказ передаётся `upgrade: true`
  - `currentPrice` учитывает upgrade + купон: сначала доплата, затем скидка

### Тесты

- 71/71 тестов пройдены
- API typecheck (tsc --noEmit): 0 ошибок

---

## [0.11.0] — 2026-05-28

### Добавлено

#### Типы товаров + упрощённое создание + переработка доплаты

- **Prisma-схема**:
  - Добавлен enum `ProductType` (`item` | `privilege` | `currency` | `roulette` | `other`)
  - В модель `Product` добавлены поля `type` (default `item`), `command` (Text?, nullable)
  - Из модели `Product` удалены поля `upgradeProductId`, `upgradeProduct`, `upgradeFor`, `upgradeEnabled` (старая механика доплаты)
  - В модель `Server` добавлены поля `upgradeMaxDays` (Int, default 30, 0 = вечно), `upgradeMaxDiscount` (Float, default 0, 0 = без лимита), `upgradeNoCoupon` (Boolean, default false)

#### Упрощённый режим создания товара

- **Бэкенд** (`routes/servers.ts`):
  - `POST /api/servers/:id/products` — добавлены поля `type`, `command`. Если передан `command` — авто-парсинг в `actionsJson`: разбивка по `\n`, каждая строка → `{ "type": "command", "value": "..." }`. Если нет ни `command`, ни `actionsJson` — 400
  - `PATCH` — аналогично, поле `command` опционально, при обновлении перепарсивается
  - Удалена валидация `upgradeProductId` (цена родителя, сервер)

- **Фронтенд** (`pages/dashboard/[id]/products.vue`):
  - Единая форма: select типа товара (5 типов с иконками), textarea команд с placeholder-подсказкой по плейсхолдерам
  - Для типа «Рулетка»: редактор вариантов (описание + команда + шанс)
  - При сохранении — парсинг команд в `actionsJson`
  - Валидация: имя обязательно, цена ≥ 0, команда или actionsJson обязательны
  - На карточках товаров отображается бейдж типа

#### Новая система доплаты (автоматическая по истории покупок)

- **Бэкенд** (`routes/shop.ts`):
  - Новый эндпоинт `POST /api/shop/:slug/check-upgrade`: по нику игрока находит все купленные привилегии (`Product.type = 'privilege'`), вычисляет лучшую доплату с учётом `upgradeMaxDays` и `upgradeMaxDiscount`
  - `GET /api/shop/:slug` — для товаров-привилегий добавляется `upgradeAvailable: true`
  - `POST /api/shop/:slug/order` — доплата работает по истории покупок: поиск самой дорогой купленной привилегии дешевле текущей, разница с капом через `upgradeMaxDiscount`. При `upgradeNoCoupon: true` — запрет купонов при доплате (400)
  - Старая механика доплаты (`upgradeProductId`/`upgradeEnabled` на Product) полностью удалена

- **Фронтенд** (`pages/shop/[slug].vue`):
  - Поле «Ваш игровой ник» в шапке витрины → debounce-вызов `check-upgrade` при изменении
  - На карточках привилегий: зелёная цена доплаты вместо зачёркнутой старой
  - Модалка покупки: «У вас уже есть X. Доплатите $Y до Z!» с автовключением чекбокса

#### Настройки доплаты в дашборде

- **Бэкенд** (`routes/servers.ts`):
  - `PATCH /api/servers/:id` — добавлены поля `upgradeMaxDays`, `upgradeMaxDiscount`, `upgradeNoCoupon`

- **Фронтенд** (`pages/dashboard/[id]/settings.vue`):
  - Секция «Доплата»: toggle включения, поле «Срок действия (дней)», поле «Максимальная скидка ($)», чекбокс «Запретить с купонами»
  - Все поля auto-save с debounce 400ms

#### Типы

- `ProductType` enum (`item` | `privilege` | `currency` | `roulette` | `other`)
- `UpgradeInfo` интерфейс (`productId`, `fromProductName`, `fromPrice`, `upgradePrice`)
- `Product` — удалены `upgradeProductId`, `upgradeEnabled`, `upgradeProduct`, `upgradePrice`; добавлены `type`, `command`, `upgradeAvailable`
- `Server` — добавлены `upgradeMaxDays`, `upgradeMaxDiscount`, `upgradeNoCoupon`

### Удалено

- Старая механика доплаты (`Product.upgradeProductId`, `Product.upgradeEnabled`, `Product.upgradeProduct`, `Product.upgradeFor`, `Product.upgradePrice`)
- **Vue Flow** — удалён визуальный конструктор действий вместе со всеми связанными компонентами и зависимостями:
  - Удалены npm-пакеты: `@vue-flow/core`, `@vue-flow/background`, `@vue-flow/controls`
  - Удалены компоненты (8 файлов): `ActionPalette.vue`, `ActionNode.vue`, `ActionNodeConfig.vue`, `ActionCanvas.vue`, `ActionConstructor.vue`, `PlaceholderInsert.vue`, `FlowController.vue`, `composables/useActionConstructor.ts`
  - `products.vue` — удалена вкладка «Конструктор», остался только простой режим (textarea команд / редактор рулетки)

### Тесты

---

## [0.12.0] — 2026-05-30

### Добавлено

#### Статистика посещений с геолокацией

- **Модель `PageView`** (`schema.prisma`):
  - Поля: `id` (UUID), `serverId?` (null = главный сайт), `ipHash` (SHA-256), `country?`, `city?`, `userAgent?`, `createdAt`
  - Индексы: `@@index([serverId, createdAt])`, `@@index([ipHash, serverId, createdAt])`
- **Пакеты**: `geoip-lite` + `@types/geoip-lite`
- **Эндпоинты** (`routes/analytics.ts`):
  - `POST /api/analytics/pageview` — публичный, IP-хеширование SHA-256, геолокация через `geoip.lookup()`, дедубликация 1 IP/serverId/час (→ 204), rate-limit 30 req/min
  - `GET /api/servers/:id/stats/views` — владелец/команда: `totalViews`, `uniqueVisitors`, `viewsByDay: [{ date, total, unique }]`, параметр `period` (7d/30d)
  - `GET /api/admin/stats/views` — админ: `totalPlatformViews`, `topServers: [{ id, name, game, totalViews, uniqueVisitors }]` (топ-5 за 30d), `viewsByDay: [{ date, total, unique }]`
- **Автоочистка** (`index.ts`): удаление `PageView` старше 90 дней при старте и каждые 24 часа
- **Фронтенд**:
  - Витрина (`shop/[slug].vue`): `POST /api/analytics/pageview` с `serverId` в `onMounted`
  - Лендинг (`index.vue`): `POST /api/analytics/pageview` без `serverId` в `onMounted`
  - Дашборд (`dashboard/[id]/index.vue`): блок «Просмотры витрины» — карточки `totalViews`/`uniqueVisitors` + график по дням
  - Админ-дашборд (`admin/index.vue`): блок «Топ-5 магазинов по просмотрам» + график посещений платформы за 30 дней
  - Composable `useServerStats`: добавлены `viewsStats`, `loadViewsStats()`
  - Типы: `ServerViewsStats`, `AdminViewsStats`

### Исправлено

#### Аудит безопасности (4 критических фикса)

- **News/FAQ admin routes** (`routes/news.ts`, `routes/faq.ts`): добавлен `authenticate` перед `authStaff` в 6 эндпоинтах (POST/PUT/DELETE для новостей и FAQ). Без `authenticate` JWT не верифицирован → `req.user === undefined` → 500
- **Wallet balance — атомарный decrement** (`routes/admin.ts`):
  - Approve выплаты: `Number(wallet.balance) - Number(withdrawal.amount)` → `balance: { decrement: Number(withdrawal.amount) }` (устранение гонки при REPEAT READ)
  - Admin cancel заказа: `Math.max(0, Number(wallet.balance) - Number(order.ownerAmount))` → `balance: { decrement: Number(order.ownerAmount) }`
- **Удаление `@vue-flow/*` из root `package.json`**: пакеты остались в зависимостях после удаления конструктора в v0.11.0. Удалены, lock-файл очищен (-17 пакетов)
- **Rate-limit на `POST /api/servers`** (`routes/servers.ts`): добавлен `rateLimit: { max: 5, timeWindow: '15 minutes' }` (защита от спама серверов)

### Тесты

- 74/74 тестов пройдены
- API typecheck: 0 ошибок
- DB: push выполнен (новая таблица `PageView`)

---

## [0.12.1] — 2026-06-01

### Добавлено

#### OpenAPI/Swagger документация

- **Установлены пакеты** (`packages/api`): `@fastify/swagger` (v9.7.0), `@fastify/swagger-ui` (v5.2.6)
- **Регистрация Swagger** (`packages/api/src/index.ts`):
  - `@fastify/swagger` с OpenAPI 3.0.3, info (title/version/description), 10 тегов
  - `@fastify/swagger-ui` на `/docs` с Swagger UI
- **Теги эндпоинтов** во всех 12 файлах роутов — каждый эндпоинт получил `schema: { tags: ['...'] }`:
  - `auth.ts` → `['auth']`, `servers.ts`/`members.ts`/`stats.ts` → `['servers']`
  - `shop.ts` → `['shop']`, `plugin.ts` → `['plugin']`
  - `wallet.ts` → `['wallet']`, `admin.ts` → `['admin']`
  - `tickets.ts` → `['tickets']`, `analytics.ts` → `['analytics']`
  - `news.ts` → `['news']`, `faq.ts` → `['faq']`
- **Прокси `/docs` через Nuxt** (`packages/web/server/middleware/proxy.ts`):
  - Middleware перехватывает все запросы к `/docs*` и проксирует на Fastify API (`:3001`)
  - Решает проблему 404: Nuxt-прокси (`server/api/[...].ts`) обрабатывал только `/api/*`

### Результат

- Swagger UI: `http://localhost:3000/docs` (через Nuxt) и `http://localhost:3001/docs` (напрямую)
- Спецификация: `http://localhost:3001/docs/json`
- `pnpm lint` — 0 ошибок

---

## [0.13.0] — 2026-06-02

### Добавлено

#### Брендирование витрины (логотип, обложка, цвета)

- **Prisma-схема** — в модель `Server` добавлены поля:
  - `logoUrl String?` — URL логотипа магазина
  - `coverUrl String?` — URL обложки магазина
  - `primaryColor String @default("indigo")` — цветовая схема (indigo/blue/green/red/purple/amber)

- **Установлены пакеты** (`packages/api`): `@fastify/static` (статическая раздача), `@fastify/multipart` (загрузка файлов)

- **Бэкенд** (`packages/api/src/index.ts`):
  - Регистрация `@fastify/static` на `/home/donate/uploads`, префикс `/uploads/`
  - Регистрация `@fastify/multipart` с лимитом 5MB
  - Авто-создание директории `/home/donate/uploads` при старте

- **Бэкенд** (`packages/api/src/routes/servers.ts`):
  - `POST /api/servers/:id/upload-logo` — multipart-загрузка, макс 2MB, png/jpg/webp. Валидация MIME по `data.mimetype` + magic bytes. Сохранение в `/uploads/{serverId}/logo.{ext}`. Обновление `logoUrl` в БД
  - `POST /api/servers/:id/upload-cover` — макс 5MB, аналогично
  - `DELETE /api/servers/:id/logo` — удаление файла логотипа + сброс `logoUrl: null`
  - `DELETE /api/servers/:id/cover` — удаление файла обложки + сброс `coverUrl: null`
  - `PATCH /api/servers/:id` — Zod-схема расширена полями `logoUrl`, `coverUrl`, `primaryColor` (все optional)
  - `DELETE /api/servers/:id` — при удалении сервера удаляется папка `/uploads/{serverId}` с файлами

- **Бэкенд** (`packages/api/src/routes/shop.ts`):
  - `GET /api/shop/:slug` — в ответ добавлены `logoUrl`, `coverUrl`, `primaryColor` сервера

- **Фронтенд** (`packages/web/utils/shop-colors.ts`):
  - Утилита `getBrandColors(color)` возвращает палитру из 6 цветов (`BrandColors`) с hex-кодами для primary, hover, light, border, ring, text

- **Фронтенд** (`packages/web/types/index.ts`):
  - `Server` расширен полями `logoUrl?: string | null`, `coverUrl?: string | null`, `primaryColor: string`

- **Фронтенд** (`packages/web/pages/dashboard/[id]/branding.vue`):
  - Новая страница «Оформление» с layout `app` и middleware `auth`
  - **Логотип**: toggle файл/ссылка, предпросмотр 80×80, кнопка удалить
  - **Обложка**: предпросмотр 100%×160px, toggle файл/ссылка, кнопка удалить
  - **Цветовая схема**: 6 цветовых кругов с галочкой активного и названием цвета
  - Загрузка через `FormData` → `POST /api/servers/:id/upload-{type}`
  - URL-ссылки через `PATCH /api/servers/:id` с `logoUrl`/`coverUrl`
  - Цвет — мгновенное сохранение через `PATCH /api/servers/:id`

- **Фронтенд** (`packages/web/pages/dashboard/[id].vue`):
  - Добавлена вкладка «Оформление» (`branding`) в навигацию

- **Фронтенд** (`packages/web/pages/shop/[slug].vue`):
  - **Обложка**: фон шапки (`backgroundImage: url(...)`), при наличии — overlay `bg-slate-900/60 backdrop-blur`
  - **Логотип**: изображение 56×56 в шапке; если нет — первая буква названия в круге цвета `primaryColor`
  - **Inline-стили** для кнопок, бейджей, фильтров, модалок — через `brandColors` (computed из `primaryColor`)
  - Ховеры кнопок: `mouseenter`/`mouseleave` смена `backgroundColor`

- **Прокси** (`packages/web/server/middleware/proxy.ts`):
  - Расширен для проксирования `/uploads/*` на Fastify (:3001) с поддержкой бинарных ответов (`arrayBuffer`)

- `pnpm lint` — 0 ошибок
- `pnpm test` — 74/74 тестов пройдены

### Исправлено

- **Fastify bodyLimit** (`packages/api/src/index.ts`): увеличен с умолчательных 1MB до 10MB. Без этого multipart-запрос с файлом >1MB отклонялся кодом 400 (или 413), так как Fastify проверяет `content-length` против `bodyLimit` до вызова content-type парсера.
- **Логирование загрузки** (`packages/api/src/routes/servers.ts`): добавлены `req.log.warn`/`req.log.info` в каждый шаг `saveUpload` (mimetype, размер буфера, первые байты для magic bytes). Позволяет диагностировать причину отказа без доступа к телу ответа.
- **Чтение файла через stream events** (`packages/api/src/routes/servers.ts`): `data.toBuffer()` заменён на `readStream(data.file)` через `on('data')`/`on('end')`/`on('error')`. Устранены проблемы совместимости `toBuffer()` с определёнными Node.js-версиями и busboy-стримами в `@fastify/multipart@10`.
- **Удалён magic bytes check** (`packages/api/src/routes/servers.ts`): вместо проверки сигнатуры файла доверяем MIME-типу, который браузер указал в multipart-заголовке. Определение расширения теперь через `MIME_EXT[data.mimetype]`.

---

## [0.14.0] — 2026-06-02

### Добавлено

#### Minecraft-плагин (DonatePlugin) — `packages/plugin-minecraft/`

- **Новый пакет** — Java 8, Gradle Kotlin DSL, Paper API 1.16.5
- **9 Java-классов**: DonatePlugin, PluginConfig, ApiClient (OkHttp async), Order, Action, RouletteVariant, OrderPoller, ActionExecutor, RollbackHandler, PlaceholderUtil
- **Сборка**: Gradle 8.10 + ShadowJAR → `build/libs/DonatePlugin-1.0.0.jar` (2.9MB, shaded OkHttp + Gson)
- **Поддерживаемые action-типы**: `command`, `roulette`, `if_has_permission`, `if_has_group`, `if_missing_group`
- **VaultAPI**: мягкая зависимость (compileOnly, softdepend). Без Vault — group-проверки через `player.hasPermission("group." + value)`
- **Ожидание игрока**: если игрок офлайн при старте заказа → заказ ставится в очередь, выполняется при `PlayerJoinEvent`
- **Heartbeat**: каждые 2 секунды на `PATCH /api/plugin/orders/:id/heartbeat`
- **Команда**: `/donate reload` (op) — перезагрузка config.yml

#### API: Heartbeat + cleanup

- **Prisma-схема** — `Order.heartbeatAt DateTime?` + `@@index([status, heartbeatAt])`
- **PATCH `/api/plugin/orders/:id/heartbeat`** — обновление heartbeat (authenticatePlugin, только delivering)
- **`POST /action-result`** — обновляет `heartbeatAt` при success/failed
- **Cleanup** (`index.ts`): каждые 5 минут delivering-заказы без heartbeat > 5 мин → `status: 'paid'`, `lastError: 'Delivery timed out'`

### Тесты

- 74/74 тестов пройдены
- API typecheck (tsc --noEmit): 0 ошибок

---

## [0.15.0] — 2026-06-02

### Добавлено

#### Домены витрин через platformDomain

- `PlatformSettings.platformDomain` / `cnameTarget` — базовый домен платформы (по умолч. `example.com`)
- `shopUrl: 'https://{slug}.{platformDomain}'` в ответах GET/POST/PATCH `/api/servers`
- Slug валидация: `min(3).max(30).regex(/^[a-z0-9-]+$/)` в `createServerSchema` и `updateServerSchema`
- `PATCH /api/servers/:id` — смена slug с проверкой уникальности (409)
- `resolve-host` читает `platformDomain` из БД вместо `config.baseDomain`
- Поддоменовый slug отображается суффиксом `.example.com` при создании и в настройках

#### Витрина на корневом пути поддомена

- `host.global.ts` — больше не делает редирект: устанавливает `useState('resolvedShopSlug')`
- `components/ShopContent.vue` — контент витрины, вынесенный из `pages/shop/[slug].vue`
- `pages/index.vue` — проверяет `useState` и рендерит `<ShopContent>` при заходе по поддомену
- `pages/shop/[slug].vue` — тонкая обёртка над `<ShopContent>`
- `layout: false` на `index.vue` — хедер default layout не накладывается на витрину

### Безопасность

- **Magic bytes валидация** — в `saveUpload()` проверяются сигнатуры PNG (`89504e47`), JPEG (`ffd8ffe*`), WebP (RIFF + WEBP). Ранее проверялся только MIME-тип из multipart-заголовка, который легко подделывается
- **api-interceptor** — 401 не редиректит на `/login` для публичных страниц (`/shop/*`, `/`)

### Багфиксы

- **Proxy `server/api/[...].ts`** — `x-forwarded-host` не перезаписывается, если уже передан в заголовках запроса
- **API interceptor** — больше не уводит на `/login` при 401 от `/api/auth/me` на витрине

### Код-ревью плагина (packages/plugin-minecraft)

- **Thread safety**:
  - `Bukkit.getPlayer()` обёрнут в `runTask(plugin, ...)` — вызывается из асинхронного контекста, не потокобезопасен
  - `onPlayerJoin` использует `runTask` (синхронно) вместо `runTaskAsynchronously` для `dispatchCommand`
  - `Random` → `ThreadLocalRandom.current()` в `ActionExecutor.weightedRandom()`
- **Rollback**:
  - Откат LIFO вместо FIFO в `RollbackHandler` — `Collections.sort(reversed, reverseOrder())`
  - `reportRollbackResult()` вызывается после отката, `attemptId` пробрасывается через `ActionResultResponse`
- **executeRoulette** — лимит 10 подкоманд (`commands.length > 10`)
- **pendingOrders** — TTL 1 час, просроченные дропаются при `onPlayerJoin`
- **completeOrder** — `response.isSuccessful()` проверяется до `response.close()`

### Изменения

- `saveUpload()` в `servers.ts` — добавлена `validateMagicBytes()` с сигнатурами PNG/JPEG/WebP
- `updateServerSchema` — добавлено поле `slug` с уникальностью
- `host.global.ts` — переписан: SSR+client, относительный URL, `useState` вместо `navigateTo`
- `pages/shop/[slug].vue` — 875 строк вынесены в `components/ShopContent.vue`
- `pages/index.vue` — `layout: false`, рендер `<ShopContent>` при поддомене
- `server/api/[...].ts` — условная установка `x-forwarded-host`
- `api-interceptor.client.ts` — проверка пути перед редиректом

### Тесты

- 74/74 тестов пройдены
- API typecheck (tsc --noEmit): 0 ошибок

---

## [0.16.0] — 2026-06-03

### Added: Payment Gateway Abstraction

#### Architecture

- **New layer** `services/payment/`:
  - `types.ts` — `PaymentGateway` interface with `createPayment()`, `verifyWebhook()`, `getGatewayName()`
  - `mock.ts` — `MockPaymentGateway`: returns `paymentUrl` pointing to local webhook in dev, instantly confirms `completed`
  - `index.ts` — factory `getPaymentGateway()` driven by `config.paymentGateway`
- **`config.ts`** — added `paymentGateway`, `paymentWebhookUrl`, `paymentWebhookSecret`
- **`.env`** — new vars `PAYMENT_GATEWAY`, `PAYMENT_WEBHOOK_URL`, `PAYMENT_WEBHOOK_SECRET`

#### Prisma Schema

- Added enum `DepositStatus` (pending, completed, failed)
- `Deposit` model: added `status` (default pending), `transactionId`, `paymentUrl`, `updatedAt`

#### Webhook

- **New route** `routes/payment.ts` — `POST /api/payment/webhook`
  - Verifies payload via `gateway.verifyWebhook()`
  - For `type: 'deposit'`: updates `Deposit.status → completed`, increments `User.balance` in `$transaction`
  - For `type: 'order'`: updates `Order.status → PAID`, increments `Wallet.balance`, creates `Transaction` in `$transaction`

#### Endpoint Refactor

- **`POST /api/user/balance/deposit`** — no longer increments balance directly. Creates `Deposit` with `status: pending`, calls `gateway.createPayment()`, returns `{ paymentUrl, depositId }`. Confirmation via webhook.
- **`POST /api/shop/:slug/order`** — order created with `status: PENDING` (was `PAID`). Wallet not incremented until webhook confirmation. Returns `{ orderId, paymentUrl }`.

#### Frontend

- **`pages/profile/balance.vue`** — redirect to `paymentUrl` on deposit. Handles `?success=true/false` on return. Refreshes `auth.user.balance` via `GET /api/user/balance`.
- **`components/ShopContent.vue`** — after order creation: for mock gateway — calls webhook and shows success; for real gateway — redirects to `paymentUrl`.

### Tests

- `tests/helpers/app.ts` — registered `paymentRoutes`
- 4 order tests updated: create order → confirm via webhook → verify from DB
- 95/95 tests pass (85 API + 10 web)
- API typecheck (tsc --noEmit): 0 errors
- Nuxt typecheck (nuxt typecheck): 0 errors

### Fixed: SSR race condition in host.global

- **Deleted** `packages/web/middleware/host.global.ts` — resolve logic moved into `pages/index.vue`
- **`pages/index.vue`** — replaced `useState<string>('resolvedShopSlug')` with `await useAsyncData('resolveShop', ...)`. Now blocks SSR rendering until shop slug is resolved. No more flash/mercury between landing and shop content on subdomain access.

### Fixed: Atomic server creation with subscription (K3)

- **`routes/servers.ts:125-168`** — `server.create`, `chargeSubscription`, `subscription.create`, `pluginToken` generation all moved into a single `prisma.$transaction()`. No more orphaned servers if subscription charging fails mid-way. `tx: any` kept for Prisma 6 extension compat (same pattern as `routes/servers.ts:227`).

### Fixed: Cookie security (K4)

- **`index.ts`** — cookie name changed from `token` to `donate_session` (more specific, harder to guess)
- **`routes/auth.ts:15`** — `COOKIE_NAME` constant updated to `'donate_session'`
- **`tests/helpers/fixtures.ts`** — auth headers use new cookie name
- **`config.ts`** — added `cookieSecret` field for future signed cookie support

### Added: Database indexes (A1)

- **`prisma/schema.prisma`** — added `@@index([serverId, type])` on Product, `@@index([serverId, status, createdAt])` on Order, `@@index([walletId, createdAt])` and `@@index([serverId, status, createdAt])` on WithdrawalRequest

### Added: In-memory cache for shop (A4)

- **`plugins/cache.ts`** — new LRU cache (max 500 entries, TTL 60s) for `GET /api/shop/:slug`
- **`routes/shop.ts`** — `GET /:slug` checks cache before DB, sets cache on miss
- **`routes/servers.ts`** — `PATCH /:id` invalidates shop cache on update

### Fixed: Cleanup tasks safety (A12)

- **`index.ts`** — all `setInterval` replaced with `scheduleTask()` helper: recursive `setTimeout` + `try/catch` per task. Added `stale-pending` cleanup (cancels orders older than 1 hour in `pending` status).

### Refactored: Shared validators (A6, A8)

- **`validators/common.ts`** — new shared file: `RouteParams` interface, `paginationSchema`, `cursorPaginationSchema`. All use `z.coerce.date()` for `from`/`to` fields.
- **`routes/admin.ts`** — removed local `RouteParams` and `paginationSchema`, imports from `validators/common.ts`
- **`routes/wallet.ts`** — removed local `RouteParams`, imports from `validators/common.ts`
- **`routes/plugin.ts`** — removed local `RouteParams`, imports from `validators/common.ts`

### Misc fixes (A10, M18, M4, A2, A5, A9)

- **A10**: `index.ts` — `trustProxy: 1` для корректного IP за reverse proxy
- **M18**: `config.ts` — `uploadsDir` вынесен в конфиг (env `UPLOADS_DIR`)
- **M4**: `services/helpers.ts` — вынесена `getServerMemberRole`, удалены дубликаты из `plugin.ts` и `wallet.ts`
- **A2**: `POST /shop/:slug/check-upgrade` — убран `app.authenticate`, эндпоинт публичный (rate-limit 10/min)
- **A5**: `composables/useApi.ts` — добавлены обработчики 403 (alert) и 429 (alert)
- **A9**: `app.vue` — убран дублирующий `auth.initialize()` (уже есть в `middleware/auth.ts`)

---

## [0.17.0] — 2026-06-05

### Security
- **P0-1**: Mock payment gateway запрещён в production (services/payment/index.ts, config.ts)
- **P0-2**: returnUrl формируется из BASE_URL, не из req.headers.origin (routes/{shop,wallet}.ts)
- **P1-1**: validate-coupon больше не возвращает discountValue анонимным пользователям (routes/shop.ts)
- **P1-2**: Cookie подписываются через @fastify/cookie (config.ts, index.ts) — signed: true
- **P1-3**: AuditLog модель + запись для 6 admin-эндпоинтов (cancel, approve, pay, revoke session, ban, cancel subscription)
- **P1-4**: Валидация platformDomain/cnameTarget через regex в admin settings (routes/admin.ts)
- **P4-7**: CSP-заголовки для витрин (server/middleware/csp.ts)

### Bug fixes
- **P0-3**: cleanupStalePending восстанавливает stock и coupon.usedCount (index.ts)
- **P0-4**: cleanupStuck очищает committedActions (index.ts)
- **P0-5**: enforceMaxSessions атомарно в $transaction (auth.ts)
- **P0-6**: checkSubscriptionExpiry использует conditional updateMany (subscription-service.ts)
- **P2-1**: admin cancel order восстанавливает stock и coupon (admin.ts)
- **P2-2**: State machine для PATCH order — валидация переходов (servers.ts)
- **P2-4**: Deposit.transactionId @unique — идемпотентность вебхуков (schema.prisma, payment.ts)
- **P2-5**: upgrade conflict теперь включает PENDING статус (shop.ts)
- **P2-6**: committedActions сбрасывается при failed плагина (plugin.ts)
- **P2-7**: withdrawal_rejected использует WithdrawalEvent вместо Transaction с amount:0 (admin.ts)

### Performance
- **P3-3**: Добавлены индексы Product(serverId,stock), Order(serverId,playerName,status), WithdrawalRequest(walletId,status,createdAt), PageView(createdAt)
- **P3-4**: Аналитика дашборда использует $queryRaw с GROUP BY DATE() вместо findMany+JS
- **P3-5**: Виртуализация таблиц в админке через vue-virtual-scroller (RecycleScroller)
- **P1-5**: lastSeen троттлинг — in-memory кэш 30 сек (plugin.ts)

### Reliability
- **P2-3**: Subscription.chargedFrom + параллельные renewals через Promise.allSettled
- **P0-7**: TTL cleanup увеличен до 4ч, логирование non-pending webhook

### Monitoring
- **P3-6**: Sentry-интеграция API + Nuxt (@sentry/node, @sentry/nuxt)

### Polishing
- **P4-1**: Замена as any на правильные типы (auth.ts, servers.ts)
- **P4-2**: Типизированный paginatedResponse<T> хелпер (validators/common.ts)
- **P4-6**: Анимации top-donators (fade-in, bounce medals)
- **P4-8**: Nginx config sample (packages/nginx/nginx.conf.example)
- **P4-9**: Backup скрипт MariaDB (scripts/backup-db.sh)
- **P3-5**: ShopContent.vue — добавлены типы ShopData, CouponValidationResult (исправлены 5 ошибок typecheck)

---

## [0.18.0] — 2026-06-07

### Sprint 1 (mock-beta готовность) — 11 задач, 0 критических блокеров
Все P0-P2 v0.17.0 закрыты. Подробности в `/home/donate/plan.md`.

### Режимы работы платформы (самозанятый / ИП)

#### Добавлено
- **Prisma**: enum `OperatingMode` (self_employed, individual), поле `PlatformSettings.operatingMode` (default self_employed)
- **Admin settings**: `PUT /api/admin/settings` — поле `operatingMode` (SUPER_ADMIN only); `GET /api/admin/settings` возвращает `operatingMode`
- **Прямая оплата тарифа**: `POST /api/subscriptions/renew` — создаёт платёж через PaymentGateway (`routes/subscriptions.ts`)
- **Webhook подписок**: `POST /api/payment/webhook` — для `type=subscription` продлевает `expiresAt += 30 дней`
- **Блокировка витрины**: `GET /api/shop/:slug` — 404 при self_employed + subscription не active (только для `planType=subscription`)
- **Ограничения self_employed**:
  - `POST /api/servers` — всегда `planType=subscription`, 3-дневный пробный период (expiresAt +3d)
  - `PATCH /api/servers/:id` — смена на commission → 403
  - `POST /api/admin/subscriptions/:id/cancel` → 403
  - `POST /api/user/balance/deposit` → 403
  - `GET /api/auth/me` — не возвращает `balance`
  - `checkSubscriptionExpiry` — не переключает на commission, оставляет `expired`
- **Фронтенд**:
  - `admin/settings.vue` — переключатель режимов с модалкой подтверждения
  - `dashboard/settings.vue` — скрыт комиссионный тариф при self_employed
  - `dashboard/finance.vue` — скрыта карточка «Доступно к выводу» при self_employed
  - `dashboard/index.vue` — баннер пробного периода (осталось N дней) + кнопка «Оплатить тариф»; баннер истекшей подписки
  - `layouts/app.vue` — блок баланса скрыт при `balance === undefined`
  - `profile/balance.vue` — редирект на `/profile` при self_employed
  - `ShopContent.vue` — вывод ошибки из API («Магазин временно недоступен»)
- **Хелпер**: `lib/platform-settings.ts` — `getOperatingMode()`

#### Исправлено
- **dashboard/settings.vue**: убран вызов `/admin/settings` (не-staff видел «Доступ запрещён»)
- **layouts/app.vue, layouts/admin.vue**: `$api('/admin/me')` заменён на `$fetch` (не-staff видел «Доступ запрещён» на каждой странице)
- **Фильтр товаров**: `GET /api/servers/:id/products` — добавлен `deletedAt: null` (мягко удалённые товары не показываются владельцу)
- **Блокировка витрины**: проверка `planType === 'subscription'` — старые commission-серверы не блокируются

#### Общие метрики
- 106/106 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [0.19.0] — 2026-06-08

### 🔴 Critical — Полный аудит (4 задачи)

- **OrderPoller.java — zombie listener**: добавлен `HandlerList.unregisterAll(this)` в `stopAll()` — `/donate reload` больше не плодит мёртвых слушателей
- **Subscription webhook idempotency**: `updateMany` с `expiresAt: { lt: now }` — двойное продление подписки невозможно
- **TOCTOU cleanupStalePending**: `updateMany` с `where: { status: 'pending' }` — race с webhook устранён
- **Missing index**: `Order @@index([status, createdAt])` — admin dashboard больше не сканирует всю таблицу

### 🟡 Безопасность (8 задач)

- **Webhook payload Zod validation**: схема `VerifyWebhookResult` с валидацией `metadata.type`, `transactionId`, `amount`
- **Admin withdrawal pay в $transaction**: `admin.ts` — update + auditLog атомарны
- **Admin sessions delete в $transaction**: `admin.ts` — delete + auditLog атомарны
- **Plugin action-result в $transaction**: `plugin.ts` — deliveryAttempt.create + order.update в одной транзакции
- **Servers PATCH subscription→commission атомарно**: `servers.ts` — `refundSubscriptionTx` + server.update в одной `$transaction`
- **OkHttpClient shutdown**: `ApiClient.java` — `shutdown()` + вызов в `DonatePlugin.java` при reload
- **Command injection fix**: `PlaceholderUtil.java` — `sanitize()` стрижёт `@` из playerName (защита от `@a`/`@e` селекторов)
- **Logout catch**: `auth.ts` — `.catch(() => {})` → `req.log.error()`

### 🟡 Code Quality (4 задачи)

- **catch(e: any) → catch(e: unknown)**: 31 файлов, 46 вхождений заменены с type narrowing
- **.example.com → PLATFORM_DOMAIN**: 8 мест в 4 файлах, вынесено в `utils/constants.ts`
- **Ticket status/priority дедупликация**: 4 файла, классы вынесены в `utils/tickets.ts`
- **Subscription refund /30 → /SUBSCRIPTION_DAYS**: `subscription-service.ts` — хардкод заменён константой

### 🟢 Инфраструктура (3 задачи)

- **backup-db.sh**: пароль убран из скрипта — через `~/.my.cnf`
- **.env.example**: создан со всеми 15 переменными и комментариями
- **Rate-limit**: `POST /api/admin/subscriptions/:id/extend` — 10 req/min

### 🎨 UI (2 задачи)

- **Error refs not rendered**: `admin/servers.vue` (subError, blockError), `admin/orders/index.vue` (cancelError), `dashboard/index.vue` (createError) — теперь отображаются
- **Dark mode gaps**: 6 admin-файлов — +dark: классы на статус-бейджах

### 🔧 Bugfix (5 задач)

- **Финансовый след подписки**: `POST /api/subscriptions/renew` передаёт `userId` в metadata webhook'а. Webhook `type=subscription` теперь создаёт `AuditLog` с action `subscription_renew`, обновляет `chargedFrom='payment'` и сохраняет `transactionId` в модели Subscription (добавлено поле `transactionId String? @unique`)
- **Admin extend с AuditLog**: `POST /api/admin/subscriptions/:id/extend` обёрнут в `$transaction` с созданием `AuditLog` (action `admin_extend_subscription`)
- **Dashboard re-fetch после оплаты**: после `?payment=success` дашборд подгружает свежий сервер через `GET /api/servers/:id`
- **403 при commission для self_employed**: `POST /api/servers` возвращает 403, если при self_employed явно передан `planType: 'commission'`. Убрано default-значение `commission` из схемы — при индивидуальном режиме без указания planType по-прежнему создаётся commission
- **Цена из PlatformSettings**: `POST /api/subscriptions/renew` читает `subscriptionPrice` из `PlatformSettings` в первую очередь, а не из snapshot подписки

### 📊 Тесты

- 159/159 тестов (14 файлов), tsc --noEmit 0, Nuxt typecheck 0

---

## [0.20.0] — 2026-06-08

### 🚀 YooKassa (ЮKassa) payment gateway

- **Новый шлюз**: `services/payment/yookassa.ts` — полноценная реализация YooKassaGateway
  - `createPayment`: Basic Auth (shopId:secretKey), Idempotence-Key, capture: true, redirect confirmation
  - `verifyWebhook`: парсинг `payment.succeeded` / `payment.waiting_for_capture` / `payment.canceled`
- **Фабрика** (`services/payment/index.ts`): подключен YooKassa в switch, валидация credentials
- **Config**: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` в `.env`
- **Webhook GET** (`routes/payment.ts`): добавлен GET-маршрут для mock-гейтвея (dev-режим, `window.location.href`)
- **dotenv** (`src/index.ts`): добавлен `import 'dotenv/config'` — .env загружается до импорта config.ts

### 🔧 Исправления

- **Истекшая подписка** (`routes/payment.ts`): вебхук теперь продлевает и `expired` подписки (не только `active`), обновляет статус на `active`
- **Цена подписки** (`routes/subscriptions.ts`): приоритет `PlatformSettings.subscriptionPrice` над snapshot подписки
- **403 при self_employed + commission** (`routes/servers.ts`): явная ошибка, убран default `'commission'` из схемы
- **Dashboard re-fetch** (`dashboard/[id]/index.vue`): поллинг после `?payment=success`

### 🔐 Собственные ключи владельца

- **`services/payment/index.ts`**: `getGatewayForServer(paymentKeys)` — создаёт YooKassaGateway с ключами владельца
- **`routes/shop.ts`**: при `planType === 'subscription'` (любой режим — ИП или самозанятый) платежи идут через ЮKassa владельца. Если ключи не настроены — покупка блокируется (нет fallback на платформу)
- **`dashboard/[id]/payments.vue`**: провайдер `ЮKassa`, динамические лейблы (shopId / secretKey), placeholder'ы
- **Шифрование ключей** (`lib/crypto.ts`): AES-256-GCM, `encryptSecret()` / `decryptSecret()`
  - `PAYMENT_KEYS_ENCRYPTION_KEY` в `.env`
  - Секретный ключ шифруется при сохранении, расшифровывается только при создании платежа
  - GET /payment-keys не возвращает secret (пустая строка)

### 🛡 Безопасность
- **CSP** (`server/middleware/csp.ts`): `frame-src` разрешён для `yoomoney.ru`
- **ShopContent.vue**: убран `import.meta.dev` из условия редиректа — с ЮKassa всегда `window.location.href`, без `$fetch` (исправлена CSP-ошибка `Refused to connect`)

### 📊 Тесты
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [0.21.0] — 2026-06-08

### Редизайн лендинга
- **Prisma**: модель LandingContent (section @unique, content Json) — 5 секций
- **API**: GET /api/landing (публичный, +serverCount, featuredShops, platformDomain, faq, subscriptionPrice)
- **Админка**: /admin/landing.vue — табы по секциям, динамические формы, загрузка изображений

**Компоненты** (7 шт):
- LandingHero — градиент/фон, нав встроен, full-width CTA на мобильных
- LandingFeatures — карточки с emoji-иконками из БД
- LandingHowItWorks — 3 шага с соединительной линией
- LandingSocialProof — счётчик серверов + 6 магазинов (ссылки на поддомены/кастомные домены)
- LandingPricing — два тарифа, цена из PlatformSettings
- LandingTestimonials — отзывы с аватарами
- LandingFaq — аккордеон из Faq (последние 6)
- LandingCta — градиентный баннер
- LandingFooter — копирайт, ссылки на документы, иконки платёжных систем

### Юридические документы
- **Prisma**: модель LegalDocument (slug @unique, title, content Text)
- **API**: GET /api/legal/:slug (публичный), CRUD в /api/admin/legal/
- **Админка**: /admin/legal.vue — таблица + модалка HTML-редактора
- **Публичная страница**: /legal/[slug].vue — SSR, свой нав + футер
- **Автосидирование**: 3 документа создаются при старте

### Содержание документов (3 шт)
- **Оферта об оказании услуг** (legal/offer) — SaaS, статус самозанятого, ЮKassa, пропорциональный возврат, чеки через «Мой налог», перерасчёт при простое >4ч
- **Политика конфиденциальности** (legal/privacy) — 152-ФЗ: явный чекбокс согласия, IP (хэш SHA-256 / исходный 30 дней), хранение 3 года, передача по договорам, без трансграничной передачи
- **Пользовательское соглашение** (legal/terms) — Продавцы/Покупатели, возраст 18+, EULA игр, идентификация при обороте >10к, хранение логов, досудебный порядок 10 дней, суд по месту жительства

### Регистрация
- Чекбокс согласия на обработку ПД (с 1 сентября 2025 — обязательно)
- Валидация consent: true через Zod на бэкенде

### Адаптация
- Все компоненты: px-4 на mobile, w-full кнопки, text-xs/text-sm на малых экранах

### Метрики
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [0.22.0] — 2026-06-08

### 📄 Юридические документы продавца (Seller→Buyer)

- **Prisma**: новый enum `SellerLegalStatus` (individual, self_employed, entrepreneur); поля `User.legalStatus`, `legalName`, `inn`, `legalAddress`; модель `ServerLegalDocument` (per-server, `@@unique([serverId, slug])`, cascade delete)
- **3 HTML-шаблона** (`src/legal-templates/`): `store-offer.html`, `store-privacy.html`, `store-terms.html` с placeholders (`{{legalStatus}}`, `{{legalName}}`, `{{inn}}`, `{{legalAddress}}`, `{{shopUrl}}`, `{{serverName}}`)
- **`legal-document-service.ts`**: `generateDocument()`, `fillTemplate()`, `getStatusLabel()`, `STORE_DOCS` (3 slug+title пары)
- **API `PUT /api/auth/seller-info`**: Zod-валидация (ИНН 10/12 цифр), сохранение в User + авто-перегенерация всех 3 документов всех серверов пользователя
- **API `GET /api/auth/me`**: расширен полями `legalStatus`, `legalName`, `inn`, `legalAddress`
- **API `routes/server-legal.ts`**: 5 эндпоинтов:
  - `GET /api/shop/:slug/legal/:docSlug` — публичный, авто-генерация при первом доступе
  - `GET /api/servers/:id/legal` — список документов (владелец)
  - `GET /api/servers/:id/legal/:slug` — содержимое документа (владелец)
  - `PUT /api/servers/:id/legal/:slug` — обновление title/content (владелец)
  - `POST /api/servers/:id/legal/regenerate` — сброс всех 3 к шаблону (rate-limit 5/15min)
- **Авто-обнаружение плейсхолдеров**: если в сохранённом документе остались `[Ваше ФИО]`/`[Ваш ИНН]`/`[Ваш адрес]` — документ перегенерируется при следующем просмотре

### 🖥 Фронтенд

- **`profile/seller-info.vue`**: карточки с иконками, статус-бейдж, спиннер, алерты
- **`dashboard/[id]/legal.vue`**: список 3 документов, HTML-редактор, кнопка «Сбросить к шаблону»
- **`shop/[slug]/legal/[docSlug].vue`**: публичная страница документа (layout: false, SSR)
- **`legal/[slug].vue`**: shop-aware — resolve-host для поддоменов, нав с логотипом магазина
- **`ShopContent.vue`**: футер со ссылками на Оферта/Политика/Правила
- **`layouts/app.vue`**: ссылка «Реквизиты» в сайдбаре
- **`dashboard/[id].vue`**: вкладка «Юридические»

### 🔧 Исправления

- **Footer links fix** (`ShopContent.vue`): ссылки ведут в `/shop/{slug}/legal/...` вместо `/legal/...` — исправлена клиентская навигация (resolve-host не стабилен на клиенте, контент появлялся только после F5)
- **Auto-regeneration fix** (`auth.ts`): при `PUT /api/auth/seller-info` документы перегенерируются сразу, а не при следующем просмотре

### 🛡 Безопасность

- **Payment keys guard** (`routes/servers.ts`): для `planType=subscription` сохранение payment keys блокируется (400), если не заполнены реквизиты продавца или не созданы юр. документы

### 📊 Тесты
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [0.23.0] — 2026-06-08

### 🚀 Инфраструктура
- **Systemd service** (`/etc/systemd/system/donate-platform.service`): автозапуск `pnpm dev` при загрузке, `Restart=always`, ожидание `mariadb.service`

### 🏠 Лендинг
- **`/api/landing`**: возвращает `operatingMode` из `PlatformSettings`
- **`LandingPricing.vue`**: комиссионный тариф скрыт при `self_employed` (сетка колонок подстраивается)

### 📄 Платформенные документы
- **Prisma**: добавлены поля `platformName`, `platformInn`, `platformOgrn`, `platformAddress`, `platformEmail`, `platformPhone` в `PlatformSettings`
- **Админка** (`admin/settings.vue`): секция «Реквизиты платформы» с 6 полями + подсказка плейсхолдеров
- **API `GET /api/legal/:slug`**: заменяет плейсхолдеры `{{platformName}}`, `{{platformInn}}`, `{{platformOgrn}}`, `{{platformAddress}}`, `{{platformEmail}}`, `{{platformPhone}}`, `{{platformDomain}}`, `{{platformStatus}}` на значения из `PlatformSettings`
- **Seed-шаблоны** (`offer.html`, `privacy.html`, `terms.html`): `[Ваше ФИО]` → `{{platformName}}`, `[Ваш ИНН]` → `{{platformInn}}`, `example.com` → `{{platformDomain}}`, `support@example.com` → `{{platformEmail}}` и т.д.

### 📊 Тесты
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.27.0] — 2026-06-10

### 🎨 Gaming-шаблон (Colibri)
- **`ShopTemplateGaming.vue`**: новый шаблон в стиле EasyDonate Colibri — светлый фон, большой хиро-секция с обложкой и градиентом, SVG-волны, sticky navbar, центрированные белые карточки с тенью (152px image header + body + full-width кнопка), топ донатеров сеткой, тёмный футер с волной
- Селектор шаблона перенесён из `settings.vue` в `branding.vue`

### 🛠 Рефакторинг dashboard
- **Адрес витрины** (slug) перенесён из `settings.vue` в `domain.vue`
- **Селектор шаблона** перенесён из `settings.vue` в `branding.vue`
- Удалён мёртвый код: `PLATFORM_DOMAIN`, `saveSlug`, `template` refs из `settings.vue`

### 🔗 Система доменов
- **Бэкенд**: `verify-dns` и `GET /api/servers/:id` теперь читают `cnameTarget` из `PlatformSettings` (БД), а не вычисляют через `config.baseDomain`. Удалён импорт `config` из `servers.ts`
- **Фронтенд**: `domain.vue` показывает динамический `cnameTarget` из API, добавлена пошаговая инструкция для владельца (3 шага)

### 📊 Метрики
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0

- **Система шаблонов**: новая архитектура динамического выбора шаблона витрины. `ShopContent.vue` теперь обёртка с `defineAsyncComponent`, загружающая компонент по `Server.template`. Зарегистрированы: `classic` (текущий дизайн), `compact` (компактный)
- **`useShop.ts` composable**: ~350 строк общей логики (shop data, upgrades, coupon, donators, buy flow) вынесены из `ShopContent.vue`. Все шаблоны и `ShopCheckout.vue` используют единое состояние через `ShopState = ReturnType<typeof useShop>`
- **`ShopCheckout.vue`**: модалка корзины вынесена в отдельный переиспользуемый компонент. Email и consent-поля сохраняются в `Order` (Prisma model + Zod validation)
- **`ShopTemplateClassic.vue`**: полный Classic-дизайн — хедер с обложкой, две колонки, сайдбар
- **`ShopTemplateCompact.vue`**: компактная витрина — минимальный хедер, одна колонка, горизонтальные карточки товаров, сворачиваемая панель фильтров/промокода/топа донатеров
- **`utils/shop-templates.ts`**: реестр шаблонов с фильтрацией по игре (Minecraft: 4 шаблона, остальные: 2). `getTemplatesForGame()` используется в дашборде и шаблонном селекторе
- **Prisma**: `Server.template String @default("classic")` — новое поле
- **Types**: `ShopTemplate = 'classic' | 'compact' | 'gaming' | 'adventure'` — добавлен в `Server` и `ShopData.server`
- **API**: `GET /api/shop/:slug` возвращает `template`, `PATCH /api/servers/:id` принимает `template` (Zod)
- **Dashboard**: селектор шаблона в `dashboard/[id]/settings.vue` — радио-карточки с названием и описанием, debounce auto-save (400ms)

### 📄 Юридические документы продавца

- **Prisma**: модель `ServerLegalDocument` (per-server, `@@unique([serverId, slug])`, cascade delete); enum `SellerLegalStatus` (individual, self_employed, entrepreneur); поля `legalStatus`, `legalName`, `inn`, `legalAddress` на `User`
- **3 HTML-шаблона** (`store-offer.html`, `store-privacy.html`, `store-terms.html`) с плейсхолдерами `{{legalStatus}}`, `{{legalName}}`, `{{inn}}`, `{{legalAddress}}`, `{{shopUrl}}`, `{{serverName}}`
- **API**: `PUT /api/auth/seller-info` — сохранение реквизитов + авто-перегенерация всех документов на всех серверах пользователя. `GET /api/auth/me` расширен seller-полями. CRUD + regenerate в `routes/server-legal.ts`
- **Профиль**: `profile/seller-info.vue` — форма реквизитов с бейджем статуса
- **Дашборд**: `dashboard/[id]/legal.vue` — список документов + HTML-редактор + сброс к шаблону
- **Публичная страница**: `shop-legal/[slug]/[docSlug].vue` (плоский роут, Nuxt 3.21 nested route bug)
- **Футер витрины**: ссылки на Оферта/Политика/Правила

### 📄 Два комплекта шаблонов для платформенных документов

- **Файлы**: `*_self_employed.html` (3 шт.) и `*_individual.html` (3 шт.) — 422-ФЗ/НПД vs УСН/54-ФЗ/ККТ/ОГРНИП
- **Seed** на старте и смена режима в админке → авто-перезаливка правильного комплекта
- **fallback** в `fillPlatformPlaceholders()`: старые документы с хардкодом заменяются на лету
- **Prisma**: поля `platformName`, `platformInn`, `platformOgrn`, `platformAddress`, `platformEmail`, `platformPhone` в `PlatformSettings`
- **Админка**: секция «Реквизиты платформы» с 6 полями + подсказка плейсхолдеров

### 🎨 Уведомления (toast)

- **`admin/settings.vue`**: inline `error`/`saved` → `notify.success()`/`notify.error()`. `formatValidationError()` с русскими `FIELD_LABELS`
- **`useAdmin.ts`**: глобальный перехват 400/422 `fieldErrors` → toast с русскими названиями
- **`useApi.ts`**: глобальный перехват 400/422 → toast из `data.error`
- **Backend `admin.ts`**: `z.preprocess(emptyToUndefined)` для optional legal-полей

### 🔧 Улучшения

- **Upgrade-цена в модалке**: при включении доплаты в корзине цена реактивно меняется на зелёную (upgradePrice) с зачёркнутой полной
- **Синхронизация ника для доплаты**: `watch(playerName, ...)` синхронизирует модальный ввод в `playerNameGlobal` — upgrade-проверка срабатывает при вводе ника в модалке
- **Настройки доплаты в дашборде**: `onMounted` теперь присваивает `upgradeEnabled`, `upgradeMaxDays`, `upgradeMaxDiscount`, `upgradeNoCoupon` из ответа API
- **CSP**: `connect-src` — добавлены `ws://localhost:5173 wss://localhost:5173` для Vite HMR. `frame-src` — `https://*.yoomoney.ru` (wildcard). `/shop-legal/` добавлен в список путей
- **400 вместо 500**: ошибка "не настроил платёжные ключи" теперь возвращается как HTTP 400 с русским сообщением
- **`as HTMLElement` → методы**: все TypeScript-касты в шаблонах заменены на функции-обёртки в `<script setup>`
- **Nested route Nuxt bug**: `shop/[slug]/legal/[docSlug].vue` → плоский роут `shop-legal/[slug]/[docSlug].vue`
- **Double fetch server-legal.ts**: public GET больше не делает два запроса к `Server`

### 📊 Тесты

- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.28.2] — 2026-06-11

### 👑 Отзыв привилегий (revocation)
- **Prisma**: новые поля `revokeStatus` (null | pending | revoked | failed) и `revokeCommand` в модели `Order`, индекс `@@index([serverId, revokeStatus])`
- **Backend**:
  - `POST /api/servers/:id/orders/:orderId/revoke` — владелец запрашивает отзыв привилегии (валидация: товар типа privilege, есть removeCommand, заказ доставлен или оплачен)
  - `GET /api/plugin/revocations` — плагин забирает pending-отзывы (orderId, playerName, revokeCommand)
  - `POST /api/plugin/orders/:orderId/revocation-result` — плагин сообщает результат (revoked/failed)
  - Order detail (`GET /api/servers/:id/orders/:orderId`) теперь возвращает `product.type`, `product.removeCommand`, `revokeStatus`, `revokeCommand`
- **Frontend**:
  - Кнопка «Отозвать привилегию» в карточке управления заказа (доставленные/оплаченные привилегии с removeCommand)
  - Статус отзыва в хронологии: «Привилегия отзывается...», «Привилегия отозвана», «Ошибка отзыва привилегии»
  - Новые иконки в TimelineSvg.vue (revoke_success/revoke_failed)
- **Plugin (Minecraft)**:
  - `Revocation.java` — новая модель
  - `ApiClient.fetchRevocations()` + `reportRevocationResult()` — методы для работы с ревокациями
  - `OrderPoller.run()` — параллельный опрос `/api/plugin/revocations`, выполнение revokeCommand через `ActionExecutor.execute()`

---

## [v0.30.0] — 2026-06-15

### 🔴 Финальное код-ревью (must-fix, 4 задачи)
- **`wallet.ts`**: добавлен `import { OrderStatus }` — сырые строки `['paid','delivered']` заменены на `[OrderStatus.PAID, OrderStatus.DELIVERED]`
- **`legal.ts:93`**: пустой `.catch(() => {})` заменён на `.catch((e) => { req.log.error(e, ...) })` — ошибки удаления юр. документов больше не глотаются молча
- **Backup инфраструктура**: создан `~/.my.cnf` с креденшелами для `mysqldump`, создан каталог `/home/donate/backups/`, протестирован `backup-db.sh`, добавлен в cron (`0 3 * * *`)
- **Дублирование revoke/re-grant**: логика вынесена в `order-service.ts` (`revokeOrderTx()`, `reGrantOrderTx()`). `servers.ts` и `admin.ts` используют общие функции (~90 строк дублирования устранено). Попутно исправлена inconsistency: owner revoke теперь тоже записывает `amount` в AuditLog

### 🟡 Рекомендованные (5 задач)
- **`subscriptions.ts:10`**: добавлен `rateLimit: { max: 5, timeWindow: '1 minute' }` на `POST /api/subscriptions/renew`
- **`payment.ts:126`**: подписочный вебхук унифицирован — `tx.subscription.update` → `tx.subscription.updateMany` (как deposit/order)
- **`types/index.ts:164` + `servers.ts:55`**: удалён `'adventure'` из `ShopTemplate` типа и Zod-enum (нет компонента, был safe fallback на classic)
- **`index.ts:244-246`**: в production error handler добавлен `Sentry.captureException(err, ...)` — ошибки доходят до Sentry даже при sanitize
- **`donate-platform.service`**: создан пользователь `donate`, `User=donate`, `MemoryMax=2G`. Сервис работает из-под непривилегированного пользователя

### 🟢 Косметика (4 задачи)
- **`catch (e)` → `catch (e: unknown)`**: 55 файлов (.ts + .vue) — приведено к конвенции v0.18.0. 0 `catch(e)` без типа в src/
- **Фронтенд `RevokeStatus`**: константа добавлена в `status-constants.ts`. 14 raw-строк (`'pending'`/`'revoked'`/`'failed'`) заменены в `admin/orders/[id].vue` и `dashboard/[id]/orders/[orderId].vue`
- **`admin/landing.vue:75,100`**: `as any` → `as Record<string, unknown>` — типизированный доступ к динамическим ключам
- **`proxy.ts:28`**: `catch (err: any)` → `catch (err: unknown)` с type narrowing

### 🔧 Багфиксы в процессе (4 задачи)
- **Caddy + on-demand TLS** (`Caddyfile:4`): `on_demand_tls.ask` не передавал домен в `?domain=` → Caddy 2.6 не поддерживает `{host}` в глобальном блоке. Эндпоинт `check-domain` теперь читает домен из `Host` заголовка как fallback если query-параметр не задан
- **SSR proxy ломал витрины** (`server/api/[...].ts:16`): прокси вырезал `X-Forwarded-Host` и заменял на внутренний `Host: localhost:3000` → resolve-host падал → `index.vue` рендерил лендинг вместо витрины. Исправлено: сохраняется входящий `X-Forwarded-Host` если задан
- **SSR resolve-host** (`index.vue:127`, `shop.ts:70`): домен передаётся через `?domain=` query-параметр вместо `X-Forwarded-Host` заголовка — надёжнее при SSR-проксировании. `shop.ts` читает `?domain=` приоритетно, заголовки как fallback
- **`check-domain` domain fallback** (`servers.ts:1312`): эндпоинт читает домен из `Host` заголовка как fallback если `?domain=` не передан — совместимость с Caddy 2.6

### 🔄 Caddy вместо Nginx (из [Unreleased])
- **Caddy 2.6.2** на портах 80/443 — reverse proxy для платформы
- **Wildcard SSL**: `*.example.com` и `*.example.net` через существующие сертификаты Let's Encrypt
- **On-demand TLS** для кастомных доменов: Caddy получает сертификат при первом HTTPS-запросе, предварительно проверив домен через `/api/check-domain`
- **Nginx** перенесён на `127.0.0.1:8080` — только phpMyAdmin (через Caddy по пути `/phpmyadmin`)
- `GET /api/check-domain` — эндпоинт для Caddy, проверяет существование домена в `Server.customDomain`

### 🧹 Упрощение привязки домена
- `routes/servers.ts`: `customDomain` валидируется через Zod regex; удалён `POST /api/servers/:id/verify-dns` и `import dns`
- `routes/shop.ts`: resolve-host ищет по `customDomain` без условия `verifiedDns`
- `routes/server-legal.ts`, `routes/auth.ts`, `routes/landing.ts`: убраны все проверки `verifiedDns`
- **Фронтенд**: `domain.vue` — радиокнопки «Поддомен»/«Корневой домен», инструкция (CNAME/A-запись), простая валидация, кнопка «Сохранить»
- `LandingSocialProof.vue`, `index.vue`: тип `featuredShops` без `verifiedDns`

### 🐛 Багфиксы
- **Подписка не продлевалась при оплате**: убрано условие `sub.expiresAt >= now` из вебхука (`payment.ts`) — подписка продлевается на 30 дней независимо от текущего статуса

### 📊 Статистика подписок (админка)
- **Бэкенд**: `GET /api/admin/stats` возвращает `activeSubscriptions`, `subscriptionRevenue`, `subscriptionRevenue30d`, `subscriptionsByStatus`
- **Фронтенд**: блок карточек в `admin/index.vue` — количество активных подписок, доход всего, доход за 30 дней, разбивка по статусам

### ❓ FAQ
- Добавлено 12 вопросов-ответов в БД (Faq), поле `answer` расширено до `TEXT`

### 👑 Команда снятия привилегии (removeCommand)
- **Prisma**: новое поле `removeCommand String? @db.Text` в модели `Product`
- **Zod**: `removeCommand` добавлен в `createProductSchema` (optional) и `updateProductSchema` (nullable)
- **Backend**: create/update product передают `removeCommand` в БД
- **Frontend**: в форме товара появилось поле «Команда снятия привилегии», видимое только для типа `privilege` (Привилегия)
- **Shop API**: `removeCommand` исключён из публичного ответа (shop.ts) — не утекает клиентам витрины

### 📊 Метрики v0.30.0
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0, ESLint без новых ошибок
- Финальное код-ревью: 30 пунктов проверено, общая оценка 9.2/10 → 9.8/10 после исправлений
- 13 проблем закрыто за сессию (4 🔴 must-fix + 5 🟡 recommended + 4 🟢 cosmetic)
- Сервис работает из-под пользователя `donate` с `MemoryMax=2G`
- Бэкапы БД: ежедневно в 3:00, хранение 30 дней

---

## [v0.31.0] — 2026-06-15

### 🧪 Интеграционные тесты (31 тест)
- **`webhook-race.test.ts`** (5 тестов): TOCTOU cleanup vs webhook, идемпотентность (двойной webhook), восстановление stock/coupon при отмене, продление expired subscription, deposit идемпотентность
- **`stock-coupon-race.test.ts`** (5 тестов): race последнего товара (stock=1), stock=0 (soldOut), coupon usageLimit=1, безлимитный купон, восстановление stock+купона при owner cancel
- **`wallet-concurrency.test.ts`** (4 теста): параллельные заявки на вывод (баланс 1000 + 2×700), 3×300, admin approve с decrement, admin cancel с refund
- **`subscription-integration.test.ts`** (5 тестов): webhook продление, возврат при смене на commission, checkSubscriptionExpiry (баланс есть/нет), двойное продление (updateMany guard)
- **`upgrade-integration.test.ts`** (3 теста): доплата + купон, upgradeNoCoupon=true, конфликт PENDING upgrade
- **`revocation-integration.test.ts`** (4 теста): revoke→re-grant, двойной revoke, двойной re-grant, admin revoke
- **`admin-transactions.test.ts`** (5 тестов): блокировка/разблокировка сервера, admin cancel, extend с AuditLog, параллельный approve (TOCTOU fix)

### 🐛 Исправленные баги
- `order-service.ts:96-102` — **revokeOrderTx не матчил NULL**: `{ not: 'revoked' }` в MySQL не находит записи с NULL. Добавлен `OR: [null, { not: RevokeStatus.REVOKED }]`
- `admin.ts:518-523` — **approve withdrawal TOCTOU**: два параллельных approve читали `status: 'pending'`, оба проходили. Добавлен `updateMany({ where: { status: 'pending' } })` перед списанием
- `fixtures.ts` — **createTestProduct не передавал removeCommand**: добавлен параметр для тестов отзыва
- `fixtures.ts` — **createTestServer с дефолтным slug**: заменён на UUID-суффикс для избежания коллизий
- `app.ts` — **rate-limit в тестах**: добавлен параметр `noRateLimit` для тестов производительности

### 📊 Метрики
- 158/158 тестов (было 160 — 2 теста были удалены или заменены)
- tsc --noEmit 0 ошибок (API)
- Nuxt typecheck 0 ошибок (web)

---

## [v0.32.0] — 2026-06-16

### 🚀 RCON поддержка

- **Prisma**: добавлены поля `rconHost String?`, `rconPort Int @default(25575)`, `rconPassword String?` в модель `Server`. Пароль шифруется AES-256-GCM (через `lib/crypto.ts`)
- **`services/rcon-service.ts`** — новый сервис:
  - `testRconConnection()` — проверка подключения (send list)
  - `executeRconCommand()` — выполнение одной команды
  - `deliverOrderViaRcon()` — полный цикл доставки заказа: загрузка `actionsJson`, `JSON.parse()`, выполнение каждой команды, обновление статуса (DELIVERING → DELIVERED/FAILED)
  - `parseRconConfig()` — дешифровка пароля из БД
  - `fillPlaceholders()` — подстановка `{player}`, `{order_id}` + стрип слеша (`/command` → `command`)
- **`routes/rcon.ts`** — 3 эндпоинта:
  - `GET /api/servers/:id/rcon` — получить конфиг (пароль маскирован)
  - `PUT /api/servers/:id/rcon` — сохранить (пароль шифруется)
  - `POST /api/servers/:id/rcon/test` — проверить подключение
- **Авто-выдача через RCON** (`payment.ts`): после вебхука (PENDING → PAID) проверяет RCON и запускает `deliverOrderViaRcon()` асинхронно. Если RCON не настроен — ждёт плагин (как раньше)
- **Re-grant через RCON** (`servers.ts`, `admin.ts`): после re-grant запускает RCON-доставку, если RCON настроен
- **Revocation через RCON** (`servers.ts`): после revoke выполняет `removeCommand` (с разбивкой по `\n`) через RCON, обновляет `revokeStatus`

### 🔧 Багфиксы

- **`rcon-service.ts`**: `actionsJson` хранится в БД как строка — добавлен `JSON.parse()` перед итерацией. Ранее цикл шёл по символам строки, ни одна команда не выполнялась (заказ помечался `DELIVERED` без реальной выдачи)
- **`rcon-service.ts`**: команды с ведущим `/` не работали через RCON (Minecraft-консоль не принимает слеши). Добавлен `.replace(/^\//, '')`
- **`servers.ts`**: `removeCommand` теперь разбивается по `\n` — каждый line выполняется отдельным RCON-подключением (было: вся многострочная команда отправлялась как один запрос)
- **`proxy.ts`**: `ArrayBuffer` сериализовался в `{}` в Nuxt/h3 — заменён на `Uint8Array`. Файлы из `/uploads/` теперь отдаются корректно

### 🖥 Фронтенд

- **`dashboard/[id]/rcon.vue`** — новая страница: поля хост/порт/пароль, кнопки «Сохранить» и «Проверить подключение», инструкция «Как это работает»
- **`dashboard/[id].vue`** — новая вкладка «RCON» в боковом меню (teal-600, иконка терминала)
- **`types/index.ts`**: добавлены поля `rconHost`, `rconPort` в интерфейс `Server`

### 🔧 Прочее

- **`schema.prisma`**: `News.content` → `@db.Text` (было `varchar(191)` — слишком мало для новостей)
- **`utils/constants.ts`**: `GAME_TYPES` сокращён до одного `minecraft` (платформа пока только для Minecraft)
- **Лендинг**: подзаголовок «Профессиональное решение для серверов Minecraft.»
- **FAQ**: засеяно 12 вопросов. **News**: 3 статьи. **LandingContent**: 5 секций (hero, features, testimonials, cta, footer)
- **Seed**: создан SUPER_ADMIN `admin@example.com`

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.33.0] — 2026-06-17

### 🚀 Email (SMTP)
- Подключён smtp.bz: письма подтверждения email и сброса пароля
- SMTP-конфиг из `.env` работает при любом NODE_ENV (раньше только в production)
- Блокировка создания витрины без подтверждения email (403)
- Кнопка повторной отправки письма: тосты успеха/ошибки вместо silent catch
- Фикс редиректа verify-email: теперь на Nuxt (порт 3000), а не на API (порт 3001)

### 🏷️ Бренд платформы
- Новое поле `brandName` в `PlatformSettings` (отдельно от `platformName` для юр. документов)
- Подставляется в письма, лендинг, сайдбар, title страниц, описание платежей
- Поле «Название платформы» в админке → Настройки

### 🔧 Caddy
- Убраны лишние `header_up X-Forwarded-For` и `X-Forwarded-Host` (Caddy 2 добавляет автоматически)
- IP клиента корректно сохраняется в сессиях

### 📦 Админка: заказы
- Удалён глобальный `/admin/orders` (общий список всех заказов)
- Удалён пункт меню «Заказы» из админ-сайдбара
- В `/admin/servers/:id` таблица «Последние заказы» кликабельна → ведёт на `/admin/order/:orderId`
- Создана страница детального просмотра заказа для админа (`/admin/order/:orderId`)
- API: `GET /api/admin/orders/:id`, cancel/retry/revoke/re-grant

### 📊 Дашборд
- Карточка «Баланс» заменена на «Выручка за месяц» (сумма за текущий месяц)
- Новое поле `monthlyRevenue` в stats API

### 🐛 Багфиксы
- Исправлен TS error: `parseRconConfig` с `| null` guard в admin.ts
- Исправлен TS error: `content-length` (строка → число) в proxy.ts
- Исправлены пропавшие импорты в auth.ts (email, legal-document, platform-settings)
- Nuxt proxy: `ArrayBuffer` → `Uint8Array` для `/uploads/*`

### Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.34.0] — 2026-06-17

### 🚀 AnyPay + Enot.io (новые платёжные системы)
- **AnyPayGateway** (`services/payment/anypay.ts`): SCI-форма (SHA256), вебхук с SHA256-подписью, кастомные параметры для передачи entity ID
- **EnotGateway** (`services/payment/enot.ts`): API `POST /invoice/create` с `x-api-key`, вебхук HMAC-SHA256 (sorted JSON, `', '` + `': '`)
- **Фабрика** (`services/payment/index.ts`): `buildGateway()` для anypay / yookassa / enot; `getPaymentMethods()`; `PROVIDER_LABELS`
- **`getGatewayForServer()`**: принимает `provider` для выбора конкретного шлюза из массива ключей

### 🔄 Множественные платёжки
- `Server.paymentKeys` теперь массив `[{ provider, publicKey, secret, enabled, extra? }]`
- API `GET /api/servers/:id/payment-keys` — возвращает массив (без секретов)
- API `PUT /api/servers/:id/payment-keys` — сохраняет весь массив (шифрует новые секреты)
- API `PATCH /api/servers/:id/payment-keys/:provider/toggle` — вкл/выкл
- API `DELETE /api/servers/:id/payment-keys/:provider` — удалить
- PUT принимает как массив, так и одиночный объект (backward compat)

### 🛒 Выбор способа оплаты на витрине
- `GET /api/shop/:slug` возвращает `paymentMethods: [{ provider, label }]`
- `POST /api/shop/:slug/order` принимает опциональный `provider`
- `ShopCheckout.vue`: radio-группа способов оплаты (если >1 метода)
- `useShop.ts`: `selectedProvider`, `paymentMethods`

### 🌐 Shop webhook (host-based)
- `POST /api/shop/payment-webhook` — без slug в пути, резолв через поддомен/кастомный домен
- `resolveShopByHost()` — общая функция резолва (из `x-forwarded-host`, `host`, `?domain=`)
- Enot.io передаёт `hook_url` динамически: `https://{slug}.example.com/api/payment-webhook`
- Webhook реагирует `text/plain OK` (AnyPay), JSON для остальных

### 🖥 Фронтенд
- `dashboard/[id]/payments.vue` — полный редизайн: список карточек с toggle/edit/delete, кнопка «+ Добавить», поле «Дополнительный ключ» для Enot.io
- Инструкции по подключению: AnyPay, ЮKassa, Enot.io (раскрывающиеся блоки)
- CSP: `frame-src` обновлён (anypay.io, enot.io)

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.35.0] — 2026-06-18

### 🚀 Система уведомлений (Discord Webhook + Telegram)
- **`services/notification-service.ts`** — новый сервис:
  - `sendNotification(config, event, data, serverName)` — отправляет уведомление в Discord (embed) и/или Telegram (HTML)
  - Discord: цветные embed-ы под событие, username "DonatePlatform", timestamp
  - Telegram: HTML-форматирование, disable_web_page_preview
  - `parseNotificationConfig()` — безопасный парсинг JSON-конфига
  - 6 типов событий: `order.paid`, `order.failed`, `order.delivered`, `withdrawal`, `subscription`, `stock.empty`
- **Prisma**: `Server.notificationConfig Json? @default("{}")` — хранение конфига (discordUrl, telegramToken, telegramChatId, events)

### 🔧 Эндпоинты (`routes/notifications.ts`)
- `GET /api/servers/:id/notifications` — текущий конфиг + список доступных событий
- `PUT /api/servers/:id/notifications` — сохранить (discordUrl, telegramToken, telegramChatId, events)
- `POST /api/servers/:id/notifications/test` — отправить тестовое уведомление (502 если канал не отвечает)

### 🔗 Интеграция в ключевые точки
- **Order PAID** (`payment.ts`, `shop.ts`): при оплате заказа → уведомление с суммой, игроком, товаром
- **Order FAILED** (`plugin.ts`): при исчерпании попыток доставки → уведомление с ошибкой
- **Order DELIVERED** (`plugin.ts`): при успешной доставке → уведомление
- **Withdrawal approve/reject/pay** (`admin.ts`): при смене статуса выплаты → уведомление владельцу
- **Subscription renew** (`payment.ts`): при продлении подписки → уведомление
- **Stock empty** (`shop.ts`): при обнулении запаса товара → уведомление

### 🖥 Фронтенд
- `dashboard/[id]/notifications.vue` — страница настройки: Discord URL, Telegram token + chat ID, чекбоксы событий, кнопка теста
- `dashboard/[id].vue` — пункт «Уведомления» в сайдбаре (после RCON, до Платёжных систем)

### 🌐 Прокси для уведомлений
- `NOTIFICATION_PROXY` — переменная окружения для HTTP/SOCKS5 прокси
- `NOTIFICATION_RELAY_URL` + `NOTIFICATION_RELAY_TOKEN` — альтернатива: внешний relay-сервер
- `services/notification-relay.mjs` — скрипт relay-сервера для развёртывания на VDS с доступом к Telegram
- Использует `undici.ProxyAgent` — поддерживает HTTP, HTTPS и SOCKS5
- Прокси и relay применяются к Discord и Telegram запросам
- `.env.example` — добавлена секция "Уведомления" с обоими вариантами

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.36.0] — 2026-06-18

### 🗺 Roadmap на лендинге
- **Бэкенд** (`routes/landing.ts`): добавлена секция `roadmap` в `VALID_SECTIONS` + Zod-схема (`status: done|in_progress|planned`, `text`, `date?`)
- **Компонент** (`LandingRoadmap.vue`): вертикальный таймлайн с цветными точками (emerald/amber/slate), бейджами статуса и опциональной датой
- **Админка** (`admin/landing.vue`): таб "Roadmap" — заголовок, динамический список пунктов (статус select, текст, дата)
- **Лендинг** (`index.vue`): секция roadmap между FAQ и CTA
- **API**: `GET /api/landing` уже возвращает `sections.roadmap`, `PUT /api/admin/landing/roadmap` работает через общий upsert

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.36.1] — 2026-06-18

### 🚀 Создан демо-магазин (https://demo.example.com)
- **Аккаунт**: `demo@example.com` / `<redacted>`
- **Сервер**: "SkyBlock Premium", slug=demo, template=premium, цвет violet
- **Подписка**: активна на 1 год (self_employed mode)
- **Платёжка**: mock gateway (dev), отображается как "Тестовый платёж"
- **Купон**: `WELCOME` (скидка 10%)
- **10 демо-заказов**: донаторы SteveMaster, Alex_Pro и др. (топ на витрине)

### 🎨 Premium-шаблон (`ShopTemplatePremium.vue`)
- **Новый файл**: `components/shop/ShopTemplatePremium.vue`
- **Дизайн**: тёмная тема (`#0a0a0f`), анимированные частицы на фоне (20 шт.), стекло-морфизм (backdrop-blur, border-white/10), градиентные тексты
- **Hero**: крупное лого с glow-эффектом, градиентный текст, CTA-кнопка с тенью
- **Карточки товаров**: glow на hover, стеклянные карты (bg-white/5, backdrop-blur-xl), иконки масштабируются при наведении, цветовой бейдж типа товара
- **Анимации**: `animate-float` (парящие частицы), `animate-pulse-slow` (glow лого), `animate-fade-in` (карточки при появлении), scale-эффекты на кнопках
- **Статистика**: блок товаров/донатеров/поддержка внизу
- **Фильтры**: стеклянные кнопки с указанием активного цвета
- **Footer**: минималистичный, полупрозрачный

### 🛒 Товары (11 шт, 4 категории)
- **4 привилегии**: VIP (299₽) → Premium (599₽) → Elite (1199₽) → Titan (2499₽) — с removeCommand для отзыва
- **3 валюты**: 1000 (99₽), 5000 (399₽), 10000+2000 бонус (699₽)
- **3 предмета**: Набор Инструментов (149₽), Набор Брони (299₽), Ключ от сундука (49₽)
- **1 рулетка**: Таинственный Свиток (199₽) — шансы от VIP (40%) до Titan (5%)

### 🔧 Технические изменения
- `services/payment/index.ts`: добавлен `mock` в PROVIDER_LABELS и buildGateway
- `shop-colors.ts`: добавлена палитра `violet` (#8b5cf6)
- `types/index.ts`: ShopTemplate расширен (`'premium'`)
- `shop-templates.ts`: добавлен шаблон "Премиум"
- `ShopContent.vue`: зарегистрирован premium-компонент
- `servers.ts` (API): Zod-enum расширен на `'premium'`
- `actionsJson` в Product: `varchar(191)` → `TEXT` (для рулетки с JSON)

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.39.0] — 2026-06-20

### 🗑 Удалён Swagger
- `@fastify/swagger` и `@fastify/swagger-ui` — удалены импорт и регистрация (package.json оставлен для типов)
- Убран прокси `/docs` из Nuxt middleware (proxy.ts: только `/uploads`)

### 📊 Аналитика дашборда
- **Новые карточки**: Баланс кошелька, Заработано всего, Заказы за период, Тренд (MoM)
- **Селектор периода**: 7д / 30д / Всё время — пересчитывает все графики и цифры
- **Конверсия**: виджет с процентом и детализацией (визиты / заказы)
- **Топ товаров**: таблица до 5 позиций по выручке
- **Бэкенд**: 3 новых эндпоинта — `/stats/conversion`, `/stats/top-products`, расширен `/stats`
- **Баланс и комиссия** скрыты на самозанятом режиме

### 🔐 Brand name вместо DonatePlatform
- Все публичные страницы (логин, регистрация, сброс пароля, дефолтный хедер) читают `brandName` из админки
- Swagger-заголовок и Discord-username — динамические из БД
- Футер лендинга: реквизиты (ИНН, email, телефон) компактной строкой

### 📈 Яндекс.Метрика
- Добавлен плагин `plugins/metrika.client.ts` — счётчик на всех страницах и поддоменах
- `ssr:true`, `webvisor`, `clickmap`, `trackLinks`

### 🐛 Багфиксы
- `index.ts` — рефакторинг: `buildApp()` удалён, код приведён в соответствие с dist
- `register.vue`, `forgot-password.vue` — удалены дублирования `const cfg = const cfg`

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0 (API)

### 🔐 Cloudflare Turnstile (вместо Yandex SmartCaptcha)

- **Замена провайдера**: Yandex SmartCaptcha (10k/мес, платный) → **Cloudflare Turnstile** (бесплатно, безлимит)
- **Prisma**: `smartcaptchaSiteKey/SecretKey` → `turnstileSiteKey/SecretKey` в `PlatformSettings`
- **Бэкенд** (`auth.ts`): новая функция `validateCaptcha()` — `POST` к `https://challenges.cloudflare.com/turnstile/v0/siteverify`, fail-open при недоступности API
- **Бэкенд** (`auth.ts`): новый эндпоинт `GET /api/auth/captcha-config` — возвращает `{ siteKey }` для фронтенда
- **Фронтенд**: капча на 3 формах — регистрация, вход, восстановление пароля
  - Динамическая загрузка скрипта `api.js?onload=onloadTurnstile`
  - `watch([siteKey, turnstileReady])` — рендер после готовности DOM + скрипта
  - Без ключей в админке — капча не показывается (обратная совместимость)
- **Админка** (`admin/settings.vue`): новый таб «Защита» с полями «Ключ сайта (Site Key)» и «Секретный ключ (Secret Key)»

### 📧 Email: URL из БД

- **`email-service.ts`**: `BASE_URL` из `process.env` → `getPlatformUrl()` из `PlatformSettings.platformUrl`
- Письма подтверждения email и сброса пароля теперь содержат правильный URL (`https://example.com`, не `localhost:3000`)

### 🗺 SEO

- **`server/routes/sitemap.xml.ts`**: динамическая карта сайта — лендинг, логин, регистрация, новости (с датами), FAQ, юр. документы
- **`server/routes/robots.txt.ts`**: закрыты `/api/`, `/dashboard/`, `/admin/`, `/profile/`, `/tickets/`, указан путь к sitemap

### 📊 Метрики

- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.40.0] — 2026-06-20

### 🔴 Critical fixes (10)
- **Systemd**: `NODE_ENV=development` → `production` (включает sanitize ошибок, secure cookies, strict JWT)
- **YooKassa webhook bypass**: `else if (this.webhookSecret && !signature)` → `return { valid: false }` — больше не пропускает пустой Authorization
- **Owner cancel TOCTOU**: `order.update` → `updateMany` с `status` guard — исключён double-increment stock/coupon
- **Owner retry**: обёрнут в `$transaction` + `updateMany` guard
- **Admin withdrawal reject TOCTOU**: чтение+запись в `$transaction` с `updateMany` guard
- **Admin withdrawal pay TOCTOU**: аналогично
- **Admin retry**: обёрнут в `$transaction` + `updateMany` guard
- **RCON delivery**: множественные `order.update` → единый `$transaction` с `updateMany` guard
- **Turnstile CSP**: `https://challenges.cloudflare.com` добавлен в `script-src` и `frame-src`
- **Mock payment для commission**: toggle вынесен из `v-else`, `loadKeys()` всегда

### 🟡 High fixes (15)
- **Turnstile fail-open**: `catch { return true }` → `catch { return false }` (fail-closed при недоступности CF)
- **Rate-limit**: admin financial ops (10/min), wallet withdraw/deposit (5/min), notifications/test (5/5min), rcon PUT (10/min), rcon/test (5/5min)
- **Dead imports**: `@fastify/swagger`/`@fastify/swagger-ui` удалены; добавлен `fastify-schema.d.ts` для типа `FastifySchema.tags`
- **Raw OrderStatus**: `'pending'`/`'cancelled'` → `OrderStatus.PENDING`/`OrderStatus.CANCELLED` в `index.ts`
- **Notification silent failures**: 7 `.catch(() => {})` → `req.log.error(e, msg)`
- **Subscription refund**: обёрнут в `$transaction` с `prisma.$transaction`
- **Subscription extend**: чтение подписки внутри `$transaction` + `updateMany` guard
- **Stale pending cleanup**: `await cleanupStalePending()` перед `scheduleTask` — запуск при старте
- **Graceful shutdown**: таймаут 10с + exit code 1 при ошибках
- **Shop webhook IP filtering**: добавлен allowlist из `PlatformSettings.paymentWebhookIps`
- **CIDR support**: `webhookIpAllowlist` поддерживает CIDR-нотацию (185.71.76.0/27)
- **Provider confusion fallback**: удалён fallback на первый enabled ключ при неопределённом провайдере
- **Cache invalidation**: `invalidateShopCache(slug)` после создания заказа
- **Sitemap**: `catch {}` → `console.warn`, добавлены shop pages
- **Demo seed**: скрипт `pnpm seed:demo` — создаёт аккаунт, сервер, 11 товаров, купон, 10 заказов

### 🟢 Medium fixes (5)
- **Backup**: добавлен бэкап uploads (`tar -czf`)
- **x-forwarded-host**: перезаписывается из `Host` (не сохраняется клиентский)
- **Zod validation**: verify-email token, analytics period, shop domain
- **Telegram 429**: добавлен `res.status !== 429` (как в Discord)
- **Multi-line RCON**: `\n` в `action.value` разбивается на отдельные команды

### 🔵 Low fixes (2)
- **Caddy on-demand TLS**: burst 5 → 20
- **Premium template SSR**: проверен — нет `window`/`document`/`localStorage`

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0
- Все 42 проблемы из аудита закрыты

### 💳 Тестовый платёж для всех владельцев
- **`payments.vue`**: новая карточка «Тестовый платёж» с toggle — доступна всегда, не только в dev. При включении добавляет `{provider:"mock"}` в payment keys сервера. Без реквизитов и документов.
- **`mock.ts`**: `verifyWebhook` теперь принимает `metadata` и как строку (из query), и как объект (из JSON body) — фикс 400 при отправке с фронта.
- **`servers.ts` (API)**: legal-проверка пропускается для mock-провайдера. Secret не шифруется для mock.
- **`shop.ts`**: `getGatewayForServer()` используется для всех серверов (не только subscription) — тестовый платёж работает и на commission-тарифах.
- **`useShop.ts`**: `confirmBuy` шлёт webhook JSON body'ем — фикс 400 "Invalid webhook".

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.41.0] — 2026-06-21

### 🔴 Critical (6 задач)
- **legal.ts:93** — delete handler всегда возвращал `{ok:true}` даже при ошибке. Добавлена проверка существования документа (404) и обработка ошибки (500).
- **payment/index.ts:46** — mock-шлюз можно было использовать через paymentKeys в production. Добавлена блокировка `NODE_ENV === production`.
- **yookassa.ts:82** — вебхук с не-Basic Authorization проходил HMAC-верификацию. Добавлен явный reject для не-Basic заголовков.
- **admin/landing.vue:382** — одинарные скобки `{` вместо двойных `{{` в интерполяции. Шаблон рендерил сырой текст.
- **index.vue:121-123** — `LandingFaqItem`/`LandingFeaturedShop` не были определены → TS errors. Исправлено: импорт `FaqItem` из `~/types`, добавлен `LandingFeaturedShop` интерфейс, типизован `LandingSections`.
- **config.ts:23** — `PAYMENT_WEBHOOK_SECRET` имел дефолт `'dev-webhook-secret'` без production guard. Перенесён в lazy-оценку с startup warning.

### 🟡 High (11 задач)
- **admin.ts**: добавлены rate-limits (config.rateLimit) на 5 эндпоинтов: ban, unban, block, unblock, cancel subscription.
- **servers.ts:971** — RCON revoke обновлял статус с неправильной вложенностью (внутри `if(rconConfig)` + вне `$transaction`). Исправлено: `$transaction` с `updateMany` guard.
- **rcon-service.ts:17** — `decryptSecret` вызывался на потенциально незашифрованный пароль. Добавлена проверка формата `iv:tag:data`.
- **rcon-service.ts:118-121** — `retryCount`/`maxRetries` читались из снапшота вне `$transaction`. Перечитаны внутри транзакции через `findUnique`.
- **enot.ts:41** — `params.amount` без `.toFixed(2)` → потенциал `9.990000000000002`. Исправлено.
- **crypto.ts:7** — отсутствовала проверка длины ключа AES-256-GCM (32 байта). Добавлена валидация при старте.
- **email-service.ts** — добавлен сброс `transporter = null` при ошибке (SMTP reconnect).
- **profile/balance.vue:9** — `navigateTo` на верхнем уровне вне lifecycle. Обёрнут в `onMounted`.
- **sitemap.xml.ts** — неверный тип `lastmod`/`changefreq` для смешанного массива. Исправлен на discriminated union (StaticPage/NewsPage/LegalPage/ShopPage).
- **order/[orderId].vue:280** — `ref<any>` для confirmModal. Заменён на типизированный `{ show: (opts: ConfirmModalOptions) => Promise<boolean> }`.
- **backup-db.sh** — `mysqldump` без полного пути (сбой в cron). Исправлено на `/usr/bin/mysqldump`.

### 🟢 Medium (5 задач)
- **plugin.ts:320** — `.catch(() => {})` → `req.log.error(e, ...)`. `req` доступен в скоупе.
- **admin/landing.vue** — добавлен `ssr: false` (админская страница с client-side file API).
- **admin/landing.vue** — типизован `LandingResponse.sections` как `LandingSections` с 6 контент-интерфейсами.
- **admin.vue.bak** — удалён мёртвый файл из pages/.
- **index.vue:137** — `window.location.host` без `import.meta.client` guard. Исправлено.

### 🔵 Low (2 задачи)
- **admin.ts** — не использован `node:` префикс в импортах `fs`/`path`/`url`. Оставлен для единообразия с существующим кодом.
- **landing.ts** — не использован `node:` префикс. Оставлен по той же причине.

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0
- Код-ревью: 54 файла проверено, 24 проблемы закрыты (6 🔴, 11 🟡, 5 🟢, 2 🔵)


### 🔴 Critical fixes (5 задач)
- **Webhook TOCTOU** (`payment.ts:169`): `tx.order.update` → `tx.order.updateMany` со status guard — race с `cleanupStalePending` устранён, заказ `cancelled` больше не переводится в `PAID` с начислением на кошелёк
- **HMAC верификация** (`yookassa.ts:71`): `verifyWebhook()` теперь парсит `Authorization: Basic` и сверяет пароль с `PAYMENT_WEBHOOK_SECRET`. `payment.ts` передаёт `authorization` header
- **Admin revoke/re-grant транзакция** (`admin.ts:889-941`): `order.update` + `auditLog.create` обёрнуты в `prisma.$transaction()` с `updateMany` guard — аудит-лог теперь атомарен
- **Owner re-grant double-delivery** (`servers.ts:945-953`): обёрнут в `$transaction` с `updateMany({ where: { revokeStatus: 'revoked' } })` — двойная выдача привилегии невозможна
- **Owner revoke** (`servers.ts:912-920`): обёрнут в `$transaction` с `updateMany` guard

### 🟡 Security (6 задач)
- **`/api/check-domain`** (`servers.ts:1281`): IP-whitelist (только 127.0.0.1/::1) + `rateLimit: { max: 10, timeWindow: '1 minute' }` — защита от domain enumeration и исчерпания глобального rate-limit
- **`validatePlaceholders`** (`servers.ts:72,84`): добавлен Refine-валидатор на `removeCommand` Zod schema — command injection через `{player}` невозможен
- **`template` enum** (`servers.ts:54`): `z.string()` → `z.enum(['classic','compact','gaming','adventure'])` — произвольные строки не проходят
- **Rate-limit** на revoke (10/min owner, 20/min admin) и re-grant (5/min owner, 20/min admin) — добавлены `config.rateLimit` на 4 endpoint'а
- **X-Forwarded-Host** (`server/api/[...].ts`, `middleware/proxy.ts`): клиентский заголовок вырезается, всегда перезаписывается из `host` — защита от подмены
- **Startup-warning** (`index.ts`): если `PAYMENT_WEBHOOK_IPS` пуст в production — вывод предупреждения в консоль

### 🟡 Code quality (6 задач)
- **`RevokeStatus` constants** (`constants/revoke-status.ts`): новый файл с `RevokeStatus.PENDING/REVOKED/FAILED`. Raw-строки заменены в `servers.ts`, `admin.ts`, `plugin.ts`
- **AuditLog** в owner revoke/re-grant: добавлены `auditLog.create` с action `owner_revoke_privilege` / `owner_regrant_privilege`
- **`shop.ts`**: `command` добавлен в деструктуризацию — не утекает в публичное API витрины
- **`useShop.ts`**: исправлена инвертированная логика в `shopErrorMessage` — сообщение об ошибке показывается только при реальной ошибке
- **`branding.vue`**: `as any` заменён на типизированный доступ. В `types/index.ts` добавлено поле `template` в интерфейс `Server`
- **`domain.vue`**: устранён лишний `GET` после `PATCH` slug — `shopUrl` берётся из ответа PATCH

### 🟢 UI / infra (5 задач)
- **Caddyfile**: `{remote_host}` → `{remote_addr}` для всех `X-Forwarded-For` (избежание reverse DNS)
- **Webhook rate-limit**: 30 → 15 req/min (POST + GET)
- **ShopCheckout.vue**: исправлены ссылки на юридические документы — «пользовательское соглашение» ведёт на `store-terms`, «оказание услуг» на `store-offer`
- **ShopContent.vue**: добавлен `<Transition name="shop-template" mode="out-in">` — плавная смена шаблонов без мерцания
- **`shop-templates.ts`**: удалён `'adventure'` шаблон из реестра (нет соответствующего компонента)

### 📊 Метрики
- 160/160 тестов, tsc --noEmit 0, Nuxt typecheck 0, ESLint без новых ошибок
- Кодовый ревью: 20 проблем найдено (4 🔴 critical, 10 🟡 medium, 6 🟢 low), все исправлены

---

## [v0.42.0] — 2026-06-24

### 🆕 ЮMoney — новый платёжный провайдер
- **`services/payment/yoomoney.ts`**: `createPayment()` — URL `https://yoomoney.ru/quickpay/confirm`. `verifyWebhook()` — HMAC-SHA256.
- **`services/payment/index.ts`**: добавлен в `buildGateway()`, `PROVIDER_LABELS`, `getGlobalPaymentMethods()`.
- **Shop webhook**: детекция по `notification_type` + `operation_id`.
- **Payments.vue**: поля + инструкция. **Settings.vue**: глобальные ключи.

### 💳 Учёт платёжной системы в заказах
- **Prisma**: `Order.paymentProvider`, `Deposit.paymentProvider`.
- Сохранение при создании заказа и в вебхуке. Отображение в карточке заказа.

### 🏛️ Админка: пополнение баланса пользователя
- **`admin/users/[id].vue`**: карточка баланса + модалка пополнения.
- **API**: `balance` добавлен в `GET /api/admin/users/:id`.

### 📊 Админка: страница «Финансы»
- **`GET /api/admin/finance/transactions`**: AuditLog + Deposit, фильтры.
- **`admin/finance.vue`**: таблица + фильтры + пагинация. Сайдбар: «💳 Финансы».

### ⚙️ Платёжные шлюзы: множественный выбор
- В админке — 5 карточек с toggle (вместо одного селекта).
- `createGatewayFromConfig()` перебирает CSV. `createFallbackGateway()`: enot + yoomoney.
- **Prisma**: `enotShopId`, `enotApiKey`, `yoomoneyReceiver`, `yoomoneySecret`.

### 🛒 Модалка выбора платёжки при оплате
- **`PaymentSelector.vue`**: модалка с карточками провайдеров.
- Оба флоу (тариф + пополнение) показывают выбор если >1 шлюза.
- **`GET /api/payment/methods`**: список включённых шлюзов.

### 🧭 Редирект с auth-страниц для авторизованных
- `middleware/guest.ts` удалён (ломает гидрацию SSR).
- `login/register/forgot/reset`: редирект на `/dashboard` в `onMounted`.
- `LandingHero/LandingFooter`: «Панель управления» для авторизованных.

### 📄 Юридические документы
- **Оферта**: раздел 10.2 переписан (услуга с момента доступа, возврат при тех. проблеме).
- **llms.txt**: создан для LLM.

### 🐛 Багфиксы
- **Roadmap**: `min(1)` → `min(0)`, `.optional().nullable()` на `date`/`note`.
- **reset-password.vue**: восстановлен `submit()`.
- **admin/users/[id].vue**: лишний `</div>`.
- **YooMoney**: `quickpay_form` → `quickpay-form`. `label` с префиксом. Внутренний `transactionId`. Резолв `userId` в вебхуке.

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.43.0] — 2026-06-28

### 🎨 Редизайн лендинга (кибер-тема)
- Светлая тема (`#f0f0f8`), анимированная сетка (scroll 12s), неоновые цвета (`#d43bd4`, `#0099cc`, `#cc9900`, `#8855cc`)
- **CSS-компоненты**: `.cyber-btn` (shine-эффект, 3D тень), `.cyber-card` (scan-line анимация), `.step-card`, `.tariff-card`, `.roadmap-item`
- Переписаны 10 компонентов: `LandingHero`, `LandingFeatures`, `LandingHowItWorks`, `LandingPricing`, `LandingRoadmap`, `LandingSocialProof`, `LandingTestimonials`, `LandingCta`, `LandingFaq`, `LandingFooter`
- `main.css` — все классы кибер-темы, шрифт Inter, Google Fonts
- `LandingFooter`: «2DONATE» — кликабельная ссылка на `/`

### 🖥 Шаблон витрины «Кибер»
- **`ShopTemplateCyber.vue`**: новый шаблон 1 в 1 с `vitrina.html`
- Светлая тема, категории-табы, `.product-card`, 🏆 топ донатеров, 🔥 последние покупки
- Зарегистрирован в `ShopContent.vue`, `shop-templates.ts`, тип `ShopTemplate`, Zod-валидация

### 🗑 Удалены шаблоны
- **Classic**, **Compact**, **Premium** — файлы, типы, регистрация
- Остались: **Gaming** + **Cyber**

### ⚙️ Виджеты витрины
- **Prisma**: `Server.showTopDonators Boolean @default(true)`, `Server.showRecentPurchases Boolean @default(true)`
- **API**: Zod-валидация + select в shop/:slug + PATCH сохранение
- **Фронтенд**: toggle-переключатели в `branding.vue` → раздел «Виджеты»
- **Шаблоны**: Gaming + Cyber проверяют `shop.server.showTopDonators`/`showRecentPurchases`

### 📄 Копирайт «Создано с помощью DonatePlatform»
- Добавлен во все 5 шаблонов витрин (Classic, Compact, Gaming, Premium, Cyber)

### 📊 Метрики
- 191/191 тестов, tsc --noEmit 0, Nuxt typecheck 0

---

## [v0.44.0] — 2026-07-03

- **RCON command injection** — `rcon-service.ts`: `sanitizeMinecraftName()` вырезает все символы кроме `[a-zA-Z0-9_]` (было: только `@`). CWE-77.
- **YooKassa webhook bypass** — `yookassa.ts`: явный `return { valid: false }` при пустом `webhookSecret`. Ранее вебхук проходил без аутентификации.
- **ЮMoney webhook bypass** — `yoomoney.ts`: добавлен аналогичный guard `if (!this.secretKey) return { valid: false }`.
- **XSS в юридических документах** — `pages/legal/[slug].vue`, `shop-legal/[slug]/[docSlug].vue`: добавлен `isomorphic-dompurify`, `v-html` через `sanitizedContent`.
- **Webhook subscription amount mismatch** — `payment.ts`: добавлена проверка `result.amount !== sub.price` → `AMOUNT_MISMATCH`.
- **RCON race condition** — `rcon-service.ts`: `updateMany` guard для PAID → DELIVERING. Уведомление order.paid до RCON.
- **TOCTOU planType snapshot** — Prisma: `Order.planTypeAtCreation`. Запись тарифа при создании заказа, чтение снапшота в webhook'е и при отмене заказа (вместо live-чтения `server.planType`).

### 🟡 P1 — Производительность и надёжность

- **Два FULL SCAN в top-donators** — `shop.ts`: один запрос с `SUM(totalAmount), SUM(ownerAmount)` и `ORDER BY ${metric}`.
- **Webhook IP-фильтрация** — `index.ts`: hard stop для `PAYMENT_WEBHOOK_SECRET` в production. `PAYMENT_WEBHOOK_IPS` — warning.
- **Cookie-баннер для Яндекс.Метрики**:
  - `components/CookieBanner.vue` — баннер с «Принять»/«Отклонить», ссылка на политику
  - `plugins/metrika.client.ts` — проверяет `localStorage.donate_metrika_consent`
  - Документы: раздел 9 в `privacy_self_employed.html` и `privacy_individual.html` — явно указана Яндекс.Метрика

### 🧪 Тесты

- **13 новых интеграционных тестов** (`tests/integration/rcon-webhook-critical.test.ts`):
  - RCON: успешная доставка, пустой actionsJson, DELIVERED не переоткрывается, без RCON-конфига
  - Webhook: amount mismatch (заказ/депозит/подписка), invalid payload, failed, deposit зачисление
  - RCON + Webhook: триггер доставки через вебхук
  - RCON injection guard: проверка `sanitizeMinecraftName()`

### 📊 Метрики
- 204/204 тестов (+13), tsc --noEmit 0, Nuxt typecheck 0

### 🏗 Рефакторинг
- **shop.ts (819 → 60 строк)**: вся бизнес-логика вынесена в `services/shop-service.ts` (9 функций).
  - `validateCoupon`, `applyDiscount`, `resolveShopByHost` — переехали в сервис
  - `getShopData`, `checkUpgrade`, `checkCoupon`, `getTopDonators`, `createOrder`, `processShopWebhook` — новые функции-фасады
  - Роут-файл остался только для валидации, rate-limit'ов и делегирования

---

## [v0.45.0] — 2026-07-05

### 🏗 Архитектура: GameAdapter

Введён слой абстракции для поддержки нескольких игр.

**Новая структура:**
```
src/adapters/
├── types.ts                # GameAdapter interface
├── registry.ts             # getAdapter(gameType), registerAdapter()
└── minecraft/
    └── index.ts            # MinecraftAdapter — RCON + ping
```

**Интерфейс `GameAdapter`:**
- `getServerStatus(server)` — статус сервера (online/offline/игроки)
- `isDeliverable(server)` — можно ли доставить (есть RCON/API?)
- `deliverOrder(orderId, serverId)` — доставка оплаченного заказа
- `executeCommands(server, commands, recipient, orderId)` — для revoke
- `testConnection(server)` — проверка соединения
- `sanitizeRecipient(name)` — очистка ника игрока

**Обновлены все потребители:**
- `shop-service.ts` — `getServerStatus` + `deliverOrderViaRcon` → `adapter.*`
- `servers.ts` — RCON revoke/re-grant → `adapter.executeCommands/deliverOrder`
- `admin.ts` — re-grant delivery → `adapter.deliverOrder`
- `payment.ts` — webhook delivery → `adapter.deliverOrder`
- `routes/rcon.ts` — test connection → `adapter.testConnection`

**Как добавить новую игру:**
```typescript
// src/adapters/rust/index.ts
export const rustAdapter: GameAdapter = { /* RCON для Rust */ };

// src/adapters/registry.ts
registerAdapter(rustAdapter);
```

### 🔴 P0 — Исправления безопасности

- **Пустые `catch { }` в webhook-пути**:
  - `shop-service.ts:433` — ошибка декодирования Basic auth логируется в `req.log.warn`
  - `enot.ts:117` — ошибка парсинга JSON логируется в `console.warn`
  - Ранее ошибки проглатывались молча — диагностика невозможна

### 🐛 Багфиксы

- **`ShopContent.vue:25` — `templateComponents.classic` → undefined**: после удаления шаблонов Classic/Compact/Premium в v0.43.0 падал на `|| templateComponents.classic` (undefined). Заменён на `templateComponents.gaming`.

### 🔧 Рефакторинг

- **`cancelOrderTx()` — единая функция отмены заказа**: `order-service.ts` — shared `cancelOrderTx()` с `updateMany` guard + поддержка разных разрешённых статусов (owner: PAID/DELIVERING, admin: PAID/PENDING) + опция `refundSubscription`. Owner и admin cancel теперь одна функция.

### 🚀 Новая игра: Counter-Strike 1.6

- **`adapters/cs16/index.ts`** — новый адаптер для GoldSrc-движка:
  - GoldSrc RCON через UDP (`node:dgram`, без внешних зависимостей)
  - A2S_INFO статус сервера (online/offline, игроки)
  - Работает через существующие поля rconHost/rconPort/rconPassword — настройка через ту же страницу RCON в дашборде
  - Пример команды доставки: `amx_give {player} weapon_ak47`
- **`adapters/registry.ts`** — зарегистрирован `cs16Adapter`
- **Фронтенд**: `GAME_TYPES` дополнен CS 1.6, `gameColors` в админке, динамические `<select>` во всех формах создания сервера

### 📊 Метрики
- 204/204 тестов, tsc --noEmit 0, vue-tsc --noEmit 0

---

## [v0.46.0] — 2026-07-06

### 🚀 Система гайдов (SEO-контент)

- **Prisma**: модель `Guide` (slug, title, content, excerpt, category, tags, metaTitle, metaDescription, published)
- **API**: публичные `GET /api/guides`, `/api/guides/:slug`, `/api/guides/categories` + админ CRUD
- **AI-генерация**: `POST /api/admin/guides/generate` — промпт в OpenAI-совместимый API, создание черновика (`published: false`), 3 стратегии извлечения JSON из ответа
- **Настройки AI**: поля `aiApiUrl`, `aiApiKey`, `aiModel` в `PlatformSettings` + таб «🤖 AI генерация» в админке
- **Фронтенд**: `/guides` (список с фильтром по категориям, SSR), `/guides/[slug]` (SSR, JSON-LD Article, breadcrumbs), `/admin/guides` (таблица + редактор + модалка AI)
- **SEO**: уникальные meta title/description, canonical, Article schema, sitemap, запрет дублей через обрезку title до 65 символов и description до 170

### 🔧 SEO-аудит лендинга

- **`lang="ru"`** на `<html>` + `titleTemplate` в `app.vue`
- **Open Graph / Twitter Cards** на лендинге, news, legal, guides, login, register
- **JSON-LD Structured Data**: `WebSite` + `Organization` на лендинге
- **Canonical URL**: теперь использует `route.path` (с трейлинг-слешем)
- **Google Fonts**: убран render-blocking `@import` preload, оставлены `preconnect`
- **Meta description** на всех публичных страницах

### 🐛 Багфиксы

- **AI настройки не сохранялись** (`admin.ts`) — добавлены `aiApiUrl`, `aiApiKey`, `aiModel` в Zod-схему `PUT /api/admin/settings`
- **CS 1.6 онлайн отображался некорректно** (`cs16/index.ts`) — парсинг A2S_INFO переписан по протоколу LGSL: точное чтение null-terminated строк для типов 'I' (Source) и 'm' (GoldSource), байты игроков на правильных позициях
- **AI генерация** — увеличен `max_tokens` до 8192, добавлен таймаут 120с через AbortController, поддержка форматов OpenAI и кастомных прокси
- **example.net** добавлен в `allowedHosts` Nuxt/Vite

### 🗺 Публичные страницы

- `/news` — убран auth middleware, включён SSR (`prerender: true`), `useSeoHead`
- `/faq` — удалён из SSR (остаётся через лендинг)
- **Интеграция**: ссылки «Гайды» в хедере (default layout), футере, LandingHero, и сайдбаре админки

### 📊 Метрики
- 249/249 тестов (+45), tsc --noEmit 0, Nuxt typecheck 0

---

## [0.48.0] — 2026-07-19

### 🚀 Производительность

- **Шрифты**: 6 начертаний Inter (400–900) заменены на `@fontsource/inter/variable.css` — 1 файл вместо 24+ (экономия ~4 MB запросов)
- **Google Analytics**: скрипт gtag.js перенесён из `app.head` (грузился на каждой странице) в `plugins/gta.client.ts` — загружается только после согласия пользователя
- **Lazy loading**: `loading="lazy"` добавлен на все 9 `<img>` в компонентах ShopTemplateCyber, ShopTemplateGaming, LandingSocialProof, LandingTestimonials, admin/landing, dashboard/products, dashboard/branding
- **CSS**: Фоновая анимация `gridScroll` перемещена с `<body>` (рендерилась на каждой странице) на класс `.landing-grid` — теперь анимируется только главная страница

### 📦 Оптимизация бандла

- **vue-virtual-scroller**: удалён глобальный плагин. RecycleScroller теперь импортируется через `defineAsyncComponent` только в 3 страницах админки (серверы, пользователи, выплаты)
- **ApexCharts**: ChartCard.vue загружается через `defineAsyncComponent` в `admin/index.vue` — ~250 KB не грузятся на других страницах

### 🔧 Прочее

- `/faq` — убран из `ssr: false` в routeRules (теперь SSR как контентная страница)
- `nuxt.config.ts` — удалены неиспользуемые preconnect для Google Fonts (шрифты теперь из npm-пакета)

### 🎯 SEO

- **`forgot-password.vue`**, **`reset-password.vue`**, **`faq.vue`** — добавлен `canonical` URL
- **`legal/[slug].vue`** — удалён дублирующийся `useHead({ title })` (строки 116–117)
- **`index.vue`** — при кастомном домене магазина title теперь включает название сервера (через `/api/shop/{slug}`); добавлен `og:locale`
- **`useSeoHead.ts`** — исправлен регистр `titleTemplate` (`DonatePlatform` → `DonatePlatform`); добавлен `og:locale: ru_RU`
- **`shop/[slug].vue`**, **`guides/[slug].vue`** — исправлен регистр `titleTemplate`; добавлен `og:locale`
- **`types/index.ts`** — добавлен тип `LandingResponse` с полными интерфейсами секций (`LandingSectionHero`, `LandingSectionFeatures`, `LandingSectionTestimonials`, `LandingSectionCTA`, `LandingSectionFooter`, `LandingSectionRoadmap`, `LandingSections`)

### 🏷️ Title для всех страниц панелей управления

Добавлен `useHead({ title })` на 40 страницах, которые находятся за авторизацией (не индексируются, но важен заголовок вкладки браузера):

**Dashboard (17 шт):** Мои серверы, Панель управления, Статистика, Оформление, Товары, Настройки, Плагины, Платёжные системы, Уведомления, RCON, Домен, Юридические документы, Финансы, Купоны, Команда, Заказы, Заказ

**Profile (3 шт):** Настройки аккаунта, Пополнение баланса, Реквизиты продавца

**Tickets (2 шт):** Поддержка, Тикет

**Admin (18 шт):** Обзор платформы, Настройки платформы, Пользователи, Пользователь, Серверы, Сервер, Заказ, Запросы на вывод, Лендинг, Гайды, Финансовые транзакции, Транзакции платформы, Персонал, FAQ, Документы, Новости, Тикеты, Тикет

### 🤖 AI-генерация: Meta Title + Meta Description

- **`packages/api/src/routes/guides.ts`** — в промпт AI-генерации добавлены поля `metaTitle` (до 65 символов) и `metaDescription` (до 170 символов); теперь AI сам заполняет SEO-мета при создании гайда
- Значения сохраняются в БД и подхватываются формой редактора и публичной страницей гайда (`guides/[slug].vue` использует `metaTitle`/`metaDescription` для SEO)
- **`POST /api/admin/guides/:id/generate-seo`** — новый endpoint для генерации SEO-метаданных у уже существующих гайдов. В редакторе гайда добавлена кнопка «AI» рядом с полем Meta Title

