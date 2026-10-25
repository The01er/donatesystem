# Настройка Caddy

Документ описывает публикацию DonatePlatform за [Caddy](https://caddyserver.com/): HTTPS, проксирование Nuxt/Fastify, wildcard-домены магазинов и on-demand TLS для пользовательских доменов.

## Схема запросов

```
Интернет
   │  :80 / :443
   ▼
 Caddy
   │  reverse_proxy
   ▼
 Nuxt (:3000) ──► /api/*      ──► Fastify (:3001)
   │          └─► /uploads/*  ──► Fastify (:3001, статика)
   ▼
 SSR-страницы и витрины
```

Наружу должны быть открыты только `80` и `443`. Порты `3000`, `3001` и `8080` (phpMyAdmin) — только локально.

## DNS

Для платформы и поддоменов магазинов:

```dns
A      example.com        <IP-сервера>
A      *.example.com      <IP-сервера>
```

Для пользовательских доменов владельцы магазинов настраивают:

```dns
CNAME  shop.customer.tld  cname.example.com
```

`platformDomain` и `cnameTarget` задаются в админке (`/admin/settings`) или через `BASE_DOMAIN`.
Поддомен магазина имеет вид `<slug>.example.com`, внешний домен хранится в `Server.customDomain`.

## Caddyfile

Пример для платформы с wildcard-сертификатом:

```caddyfile
{
	email admin@example.com
	on_demand_tls {
		# Caddy спрашивает API, можно ли выпускать сертификат на домен
		ask http://127.0.0.1:3001/api/check-domain
	}
}

(common) {
	encode zstd gzip

	# Необязательно: phpMyAdmin. Лучше закрыть по IP/VPN.
	handle_path /phpmyadmin* {
		reverse_proxy 127.0.0.1:8080
	}

	handle {
		reverse_proxy 127.0.0.1:3000 {
			header_up Host {host}
			header_up X-Forwarded-Proto https
			header_up X-Real-IP {remote_host}
		}
	}
}

example.com, *.example.com {
	tls /etc/letsencrypt/live/example.com/fullchain.pem /etc/letsencrypt/live/example.com/privkey.pem
	import common
}

# Пользовательские домены магазинов: сертификат выпускается по запросу
:443 {
	tls {
		on_demand
	}
	import common
}

:80 {
	redir https://{host}{uri}
}
```

Почему так:

- **Один upstream `:3000`.** Nuxt сам проксирует `/api/*` и `/uploads/*` на Fastify (`packages/web/server/api/[...].ts` и `server/middleware/proxy.ts`), поэтому отдельный маршрут для API в Caddy не нужен.
- **`Host` не подменяется.** По нему определяется магазин: `<slug>.example.com` или `customDomain`.
- **`X-Forwarded-Proto`** нужен для корректных secure-cookie и абсолютных ссылок.
- **`on_demand_tls`** позволяет выпускать сертификаты на произвольные домены клиентов без правки конфига.

## Сертификаты

### Вариант A: wildcard через certbot (как в примере выше)

Wildcard-сертификат нельзя получить по HTTP-01, нужен DNS-01:

```bash
certbot certonly --manual --preferred-challenges dns \
  -d example.com -d '*.example.com'
```

Файлы появятся в `/etc/letsencrypt/live/example.com/`. Продление — `certbot renew` по cron/systemd timer.

### Вариант B: полностью автоматически через Caddy

Уберите директиву `tls` у сайта `example.com, *.example.com` и настройте DNS-плагин Caddy для DNS-01 либо выпускайте сертификаты на каждый поддомен отдельно. Без DNS-плагина Caddy не сможет выпустить wildcard-сертификат.

## On-demand TLS

При первом запросе на неизвестный домен Caddy вызывает:

```
GET http://127.0.0.1:3001/api/check-domain?domain=<host>
```

Логика API (`packages/api/src/routes/servers.ts`):

1. Запрос разрешён только с `127.0.0.1` / `::1`.
2. Домен ищется в `Server.customDomain`.
3. Если найден — `200`, Caddy выпускает сертификат. Если нет — `403`, выпуск отменяется.

Поэтому:

- API должен быть доступен Caddy по `127.0.0.1:3001`;
- домен должен быть предварительно добавлен в кабинете магазина;
- проброс порта `3001` наружу не нужен и опасен.

## Переменные окружения

Минимум для production (полный список — в `.env.example`):

```env
NODE_ENV=production
PORT=3001
UPLOADS_DIR=/var/lib/donatesystem/uploads

DATABASE_URL="mysql://donate:password@localhost:3306/donate_platform"
JWT_SECRET=...
COOKIE_SECRET=...
PAYMENT_KEYS_ENCRYPTION_KEY=...

BASE_URL=https://example.com
BASE_DOMAIN=example.com
CORS_ORIGIN=https://example.com
```

`BASE_URL`, `BASE_DOMAIN` и `CORS_ORIGIN` используются как fallback, если значения не заданы в админке.

## Сборка и запуск

```bash
pnpm install --frozen-lockfile
pnpm build

# API
node packages/api/dist/index.js

# Nuxt (второй процесс)
node packages/web/.output/server/index.mjs
```

Пример systemd-юнита:

```ini
[Unit]
Description=DonatePlatform
After=network.target mariadb.service

[Service]
Type=simple
User=donate
WorkingDirectory=/opt/donatesystem
EnvironmentFile=/opt/donatesystem/packages/api/.env
Environment=NODE_ENV=production
ExecStart=/bin/sh -c 'PORT=3001 node packages/api/dist/index.js & PORT=3000 node packages/web/.output/server/index.mjs'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Проверка и перезагрузка

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
journalctl -u caddy -f
```

Проверка домена:

```bash
curl -I https://example.com
curl -I https://<slug>.example.com
curl -I https://shop.customer.tld
```

## Частые проблемы

| Симптом | Причина |
|---|---|
| `502 Bad Gateway` | Nuxt не запущен или слушает не `:3000` |
| Сертификат не выпускается | DNS не указывает на сервер, закрыт `:80`, домен не добавлен в `Server.customDomain` |
| Открывается не тот магазин | Caddy не передаёт `Host` (не убирайте `header_up Host {host}`) |
| `404` на картинках | неверный `UPLOADS_DIR` или Nuxt не проксирует `/uploads/*` |
| `403` от `/api/check-domain` | запрос не с `127.0.0.1` или домена нет в БД |

## Безопасность

- Фаервол: разрешить только `22`, `80`, `443`; `3000`, `3001`, `8080` — закрыть.
- phpMyAdmin не публиковать в интернет без дополнительной защиты.
- Не коммитить `.env`, сертификаты и приватные ключи.
- Держать `X-Forwarded-Proto`, иначе secure-cookie могут не установиться.
