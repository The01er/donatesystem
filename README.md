# DonatePlatform

SaaS-платформа для приёма донатов на игровых серверах (Minecraft, CS 1.6): конструктор магазинов, витрина, оплата, автоматическая выдача товаров через RCON и плагин.

> **Статус:** проект остановлен и опубликован «как есть». Код не поддерживается; публикация носит архивный/образовательный характер.

## Возможности

- Мультимагазины: у каждого сервера свой магазин, кошелёк и настройки.
- Конструктор товаров: предметы, привилегии, валюта, рулетки, произвольные действия.
- Оплата: YooKassa, AnyPay, Enot.io, YooMoney + mock-шлюз для разработки.
- Доставка: RCON и собственный Paper-плагин (polling, откат действий, рулетки).
- Кабинет владельца: заказы, платежи, купоны, подписки, вывод средств, брендинг, домены.
- Админ-панель: пользователи, серверы, финансы, новости, FAQ, гайды, юр. документы, настройки платформы.
- Публичная часть: лендинг, витрины, новости, FAQ, гайды, юридические документы, SEO (OG, JSON-LD, sitemap, robots).
- Безопасность: httpOnly JWT-сессии, rate-limit, AES-256-GCM для секретов, CSP, Turnstile, webhook allowlist.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Nuxt 3.21, Vue 3.5, Pinia 3, Tailwind CSS 3 |
| Backend | Fastify 5, TypeScript, Zod, JWT, bcryptjs |
| БД | MariaDB 10.11, Prisma ORM 6 |
| Плагин | Java 8, Paper API 1.16.5, OkHttp, Gson |
| Инструменты | pnpm 11, Node.js 22, Vitest, Playwright |

## Структура

```
packages/
├── api/                  # Fastify API, Prisma-схема, тесты
│   ├── prisma/schema.prisma
│   ├── src/{routes,services,plugins,lib,adapters,legal-templates}
│   └── tests/
├── web/                  # Nuxt 3: pages, components, composables, server
└── plugin-minecraft/     # Paper-плагин (Gradle, ShadowJAR)
```

## Быстрый старт

Требования: Node.js 22, pnpm 11, MariaDB 10.11.

```bash
pnpm install

# окружение
cp .env.example packages/api/.env
# заполните DATABASE_URL, JWT_SECRET, COOKIE_SECRET и остальные секреты

# схема БД
pnpm db:push
pnpm db:generate

# запуск (API :3001 + Nuxt :3000)
pnpm dev
```

Демо-данные и администратор:

```bash
pnpm seed:demo
pnpm make:admin you@example.com
```

## Основные команды

```bash
pnpm dev            # API + фронтенд в dev-режиме
pnpm build          # production-сборка
pnpm start          # production-запуск
pnpm test           # тесты API
pnpm lint           # tsc --noEmit
pnpm lint:eslint    # ESLint
pnpm format         # Prettier
pnpm db:studio      # Prisma Studio
pnpm test:e2e       # Playwright (требует тестовую БД)
```

Для тестов можно задать `TEST_DATABASE_URL`; по умолчанию используется `mysql://test:test@localhost:3306/donate_platform_test`.

## Переменные окружения

См. `.env.example`. Ключевые:

- `DATABASE_URL` — подключение к MariaDB.
- `JWT_SECRET`, `COOKIE_SECRET` — обязательны в production.
- `PAYMENT_KEYS_ENCRYPTION_KEY` — 64 hex-символа для AES-256-GCM.
- `EMAIL_*` — SMTP для писем подтверждения и сброса пароля.
- Платёжные ключи и остальные настройки задаются в админке (`/admin/settings`).

## Плагин Minecraft

```bash
cd packages/plugin-minecraft
./gradlew shadowJar
```

Готовый JAR кладётся в `plugins/` сервера. В `config.yml` укажите `api-url` и `api-token` (токен создаётся в кабинете сервера).

## Безопасность

- Никогда не коммитьте `.env`, бэкапы БД, `uploads/` и ключи — они исключены в `.gitignore`.
- Секреты платформы, платёжных шлюзов и RCON хранятся в зашифрованном виде или в переменных окружения.
- Демо-аккаунты и тестовые ключи из примеров непригодны для production.

## Лицензия

[MIT](LICENSE).

## Дисклеймер

Проект не связан с Mojang Studios, Microsoft, PaperMC или Valve. Minecraft — торговая марка Mojang Studios. Все сторонние библиотеки и товарные знаки принадлежат их владельцам.
