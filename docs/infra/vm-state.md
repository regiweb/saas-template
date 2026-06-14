# VM State — EZL-011
Зафиксировано: 2026-06-14

## Хост

| Параметр | Значение |
|---|---|
| IP | 178.236.25.13 |
| SSH port | 2200 |
| User | ezl |
| SSH auth | Ключ `~/.ssh/ezl_ed25519` (PasswordAuthentication: disabled) |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | 6.8.0-41-generic |
| CPUs | 4 |
| RAM | 7.7 GB (1.1 GB used, 6.6 GB available) |
| Disk `/` | 77 GB (7.9 GB used, 66 GB free — 11%) |

## Runtime-версии

| Компонент | Версия |
|---|---|
| Docker Engine | 29.5.3 |
| Docker Compose | v5.1.4 |
| Node.js (в контейнере) | v22.22.3 |
| Python (в контейнере) | 3.12.13 |
| PostgreSQL | 16.14 |
| Redis | 7.4.9 |
| Caddy | v2.11.4 |

## Запущенные контейнеры

| Имя | Статус | Exposed ports |
|---|---|---|
| ezl-caddy-1 | Up 2 days | 80, 443 |
| ezl-node-app-1 | Up 37 hours | 3000 |
| ezl-python-app-1 | Up 2 days | — (internal 8000) |
| ezl-postgres-1 | Up 2 days (healthy) | — (internal 5432) |
| ezl-redis-1 | Up 2 days (healthy) | — (internal 6379) |

Все контейнеры: `restart=unless-stopped`. Docker: `systemctl enabled + active` (автозапуск при ребуте).

## Структура файлов на VM

```
~/ezl/                          # рабочая директория (owner: ezl)
├── docker-compose.yml
├── Caddyfile
├── .env                        # секреты (не в git)
└── services/
    ├── node-app/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── package-lock.json
    │   ├── .eslintrc.json
    │   └── src/
    │       ├── index.js
    │       └── db.js
    └── python-app/
        ├── Dockerfile
        ├── requirements.txt
        └── src/
            └── main.py
```

> `~/ezl/` — не git-репо. Файлы доставляются через SFTP (ezl deploy CLI).

## Маршрутизация (Caddy)

| Путь | Upstream |
|---|---|
| `/health` (HTTP) | node-app:3000 — bypass redirect для deploy-проб |
| `*` (HTTP) | → 301 HTTPS |
| `/ai/*` (HTTPS) | python-app:8000 |
| `/api/*` (HTTPS) | node-app:3000 |
| `/health/node` (HTTPS) | node-app:3000/health |
| `/health/python` (HTTPS) | python-app:8000/health |
| `*` (HTTPS) | node-app:3000 (fallback) |
| TLS | `tls internal` (self-signed) |

## Health checks (проверено 2026-06-14)

```
GET /health/node  → {"status":"ok","service":"node","version":"0.1.0"}
GET /health/python → {"status":"ok","service":"python","version":"0.1.0"}
```

## Переменные окружения (.env — только ключи, без значений)

```
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
REDIS_URL
NODE_PORT, NODE_ENV
PYTHON_PORT
APP_SECRET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
FRONTEND_URL
```

## SSH-конфигурация

- `PasswordAuthentication no` — уже отключена (только ключи)
- `PubkeyAuthentication yes` (default)
- Нестандартный порт: 2200

## Образы Docker

| Repository | Tag | Size |
|---|---|---|
| ezl-node-app | latest | 276 MB |
| ezl-python-app | latest | 273 MB |
| postgres | 16-alpine | 396 MB |
| caddy | 2-alpine | 89 MB |
| redis | 7-alpine | 57.8 MB |

> Также присутствуют старые образы `ez-launch-node-app` и `ez-launch-python-app` (260/273 MB) —
> артефакты предыдущих деплоев, можно удалить: `docker image prune -f`
