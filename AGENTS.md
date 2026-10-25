# DonatePlatform — AGENTS.md

> Контекст для следующей итерации. v0.46.0.

---
##

Правила : после каждого выполненго задания записывай изменения в changelog.md

## Что за проект

SaaS-платформа приёма донатов на серверах Minecraft. Владельцы серверов создают магазины через конструктор товаров, игроки покупают товары. Гибридная модель: RCON + плагин (JAR).

## Стек

| Слой | Технология |
|---|---|
| Фронтенд | Nuxt 3.21 + Vue 3.5 + Pinia 3 + Tailwind CSS 3 |
| Бэкенд | Fastify 5 + TypeScript + Zod + JWT + bcryptjs |
| БД | MariaDB 10.11 (Prisma ORM 6) |
| Пакетный менеджер | pnpm 11 |
| Runtime | Node.js 22 |
| Reverse proxy | Caddy 2.6 (80/443): SSL wildcard + on-demand TLS |
| phpMyAdmin | Nginx на 127.0.0.1:8080 |

## Структура

```
/opt/donatesystem/
├── packages/
│   ├── api/              # Fastify backend
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── constants/         # order-status.ts, revoke-status.ts
│   │   │   ├── services/          # order, subscription, email, payment, shop, legal-document, notification, rcon
│   │   │   ├── lib/               # crypto.ts, platform-settings.ts
│   │   │   ├── plugins/           # prisma (Decimal→number), auth (JWT+session), platformStaff, cache (LRU)
│   │   │   ├── routes/            # auth, servers, shop, plugin, wallet, members, stats, admin, admin/guides, news, faq, tickets, analytics, payment, subscriptions, rcon, notifications, guides, server-legal
│   │   │   ├── validators/        # actions.ts, tickets.ts, common.ts
│   │   │   ├── legal-templates/   # HTML шаблоны документов
│   │   │   └── adapters/          # cs16/ (LGSL протокол)
│   │   ├── tests/ (249 тестов)
│   │   └── scripts/ (make-admin, seed-demo)
│   └── web/              # Nuxt 3 frontend
│       ├── pages/        # index, login, register, news, faq, guides, legal, shop, shop-legal, tickets, profile, dashboard, admin
│       ├── composables/  # useSeoHead, useShop, useAdmin, useApi, useWallet, useOrderDetail, etc.
│       ├── components/   # shop/ (ShopTemplateGaming, ShopTemplateCyber, ShopCheckout, PaymentSelector, etc.)
│       └── server/       # proxy, csp middleware
└── packages/plugin-minecraft/   # Java 8, Paper API 1.16.5
    ├── build.gradle.kts          # ShadowJAR, OkHttp 4 + Gson (shaded), VaultAPI (compileOnly)
    ├── plugin.yml                # api-version: 1.13, softdepend: [Vault], команда /donate reload
    └── src/main/java/ru/donateplatform/plugin/
        ├── DonatePlugin.java           # onEnable: config → ApiClient → OrderPoller
        ├── config/PluginConfig.java    # api-url, api-token, poll-interval из config.yml
        ├── http/ApiClient.java         # OkHttp: fetchOrders, completeOrder, reportResult, fetchRevocations
        ├── model/
        │   ├── Order.java              # id, player, actions, revokeCommand
        │   ├── Action.java             # type, command, priority, variants (roulette)
        │   ├── RouletteVariant.java    # description, command, chance
        │   └── Revocation.java         # orderId, player, revokeCommand
        ├── service/
        │   ├── OrderPoller.java        # Poll paid-заказы → heartbeat (2s) → результат
        │   ├── ActionExecutor.java     # command, roulette, if_has_permission/group, if_missing_group
        │   └── RollbackHandler.java    # LIFO-откат действий
        └── util/PlaceholderUtil.java   # {player} → sanitized ник, {order_id} → UUID
```

## БД

- **База**: `donate_platform` / тесты: `donate_platform_test`
- **Пользователь**: `donate`
- **DATABASE_URL**: `mysql://donate:***@localhost:3306/donate_platform`
- **phpMyAdmin**: локально, `127.0.0.1:8080`

## Модели Prisma (27 таблиц)

User, Server, Product, Order, DeliveryAttempt, ServerPluginToken, ServerMember, Wallet, Transaction, WithdrawalRequest, PlatformStaff, PlatformSettings, UserSession, News, Faq, Subscription, Coupon, Deposit, Ticket, TicketMessage, EmailVerification, PageView, AuditLog, WithdrawalEvent, LandingContent, LegalDocument, ServerLegalDocument, **Guide**

**Enum**: PlatformRole, OperatingMode, PlanType, SubscriptionStatus, DiscountType, TicketStatus, TicketPriority, ProductType, DepositStatus, SellerLegalStatus

## Команды

```bash
pnpm dev                  # API :3001 + Nuxt :3000 (dev режим)
pnpm dev:api              # только Fastify
pnpm dev:web              # только Nuxt
pnpm build                # production сборка (tsc + nuxt build)
pnpm build:api            # только API
pnpm build:web            # только Nuxt
pnpm start                # production запуск (API + Nuxt)
pnpm test                 # 249 тестов
pnpm lint                 # tsc --noEmit (API)
pnpm lint:eslint          # ESLint
pnpm format               # Prettier
pnpm make:admin <email>   # SUPER_ADMIN
pnpm db:studio            # Prisma Studio
pnpm db:push              # применить схему
pnpm db:generate          # регенерировать Prisma-клиент
pnpm seed:demo            # создать демо-магазин
```

## Ключевые архитектурные решения

- **SSR** только для публичных страниц (`/shop/[slug]`, `/`, `/guides`, `/legal`, `/news`, `/login`, `/register`). Дашборд и админка: `ssr: false`.
- **Прокси API**: `server/api/[...].ts` пробрасывает `/api/*` на `http://127.0.0.1:3001`. Ошибки без `err.message`.
- **Wallet** на уровне Server — раздельные счета для разных магазинов одного владельца.
- **UUID** для всех ID — распределённые плагины, безопасность витрины, шардинг.
- **Константы статусов**: `OrderStatus.PAID`, `RevokeStatus.PENDING` — не raw-строки.
- **Decimal → number**: Prisma `$extends` авто-конвертирует. `instanceof Date` guard.
- **Payment Gateway**: `payment/` абстракция (mock, yookassa, anypay, enot, yoomoney). `getGatewayForServer()` для ключей владельца.
- **AES-256-GCM** шифрование для payment secret ключей и RCON паролей.
- **State machine для Order**: `pending→paid|cancelled`, `paid→delivering|cancelled`, `delivering→paid|delivered|failed`, `failed→paid`.
- **TOCTOU-free**: `updateMany({ where: { status } })` + `$transaction` вместо `findFirst → update`.
- **Бан/блокировка**: `User.bannedAt`, `Server.blockedAt`.
- **Guides**: AI-генерация через OpenAI-совместимый API, черновики (`published: false`), 3 стратегии извлечения JSON.
- **SEO**: `useSeoHead` composable (meta, OG, Twitter, canonical, JSON-LD). Title ≤65, description ≤170.

## Безопасность

- **httpOnly Cookie**: JWT в `Set-Cookie` (httpOnly, secure в production, sameSite: lax). Не localStorage.
- **Rate-limit**: 100 req/min глобально, 5/5min на login/register, 10/min на order, 5/15min на create server, 30/min на pageview, 5/h на settings, 10/min на revoke, 5/min на re-grant, 15/min webhook.
- **x-forwarded-host**: перезаписывается из `Host`, не доверяется клиенту.
- **JWT-secret**: в production без `JWT_SECRET` сервер не запускается.
- **Атомарный decrement**: `balance: { decrement: N }` вместо `Number(x) - Number(y)`.
- **Сессии**: макс. 10 активных, старейшая вытесняется. Автоочистка истёкших.
- **SSR-safe**: `document`/`window`/`localStorage` только под `import.meta.client`.
- **Turnstile** (Cloudflare): fail-open, CSP `script-src` + `frame-src challenges.cloudflare.com`.
- **CSP middleware**: `server/middleware/csp.ts` — CSP для `/`, `/shop/*`, `/shop-legal/*`. После production-сборки изменения в middleware требуют `pnpm build`.
- **GA Consent Mode**: gtag.js всегда в `<head>` SSR. `gtag('config')` и Яндекс.Метрика — только после согласия. CookieBanner без `reload()`.
- **Sanitize**: `sanitizeMinecraftName()` для RCON, `isomorphic-dompurify` для юр. документов.
- **Webhook IP filtering**: `paymentWebhookIps` allowlist + CIDR.
- **Payment**: mock заблокирован в production, production guard на пустой webhookSecret.

## Сессии

- Модель `UserSession`: `id` (UUID = jti), `userId`, `userAgent`, `ipAddress`, `expiresAt`, `lastUsedAt`.
- JWT payload: `{ id: userId, jti: sessionId }`, `expiresIn: '7d'`.
- Проверка: после JWT → поиск сессии в БД (существует + не истекла).
- Logout: удаление сессии + `clearCookie`.
- Админ-контроль: просмотр/удаление сессий других пользователей.
- Автоочистка истёкших сессий при старте и каждый час.

## Git

- Основная ветка: `main`.
- Публикация: `git push origin main`.
- Секреты, `.env`, бэкапы БД и сгенерированные файлы в репозиторий не коммитятся (см. `.gitignore`).
- Перед публикацией история очищена от бэкапов и дампов БД.
