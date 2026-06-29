# Staging Stack — Setup Guide

> EZL-задача: CI_CD_STRATEGY.md п.7 #2  
> Обновлено: 2026-06-14
>
> ⚠️ `<DEPLOY_USER>`, `<STAGING_HOST>`, `<SSH_PORT>` — плейсхолдеры; реальные значения в private vault
> (`Security/CREDENTIALS.md`). Не коммить инфра-реквизиты в публичный репо.

## Обзор

Второй docker-compose стек (`-p ezl-staging`) на той же VM. Изолирован от прода портами и volumes.

| Параметр | Prod | Staging |
|---|---|---|
| Директория на VM | `~/ezl/` | `~/ezl-staging/` |
| Docker project | `ezl` | `ezl-staging` |
| HTTP порт | 80 | 8080 |
| HTTPS порт | 443 | 8443 |
| Compose файл | `docker-compose.yml` | `docker-compose.staging.yml` |
| Caddy конфиг | `Caddyfile` | `Caddyfile.staging` |
| Env файл | `.env` | `.env.staging` |
| Postgres DB | `ezlaunch` | `ezlaunch_staging` |
| Volumes prefix | `ezl_` | `ezl-staging_` |
| Деплой | `deploy-staging.yml` (auto, на merge в main) | — |

## Разовая настройка на VM

Выполняется один раз через SSH:

```bash
ssh <DEPLOY_USER>@<STAGING_HOST> -p <SSH_PORT>

# 1. Создать директорию
mkdir -p ~/ezl-staging

# 2. Создать .env.staging (на основе .env — изменить DB, порты если нужно)
cp ~/ezl/.env ~/ezl-staging/.env.staging
# Отредактировать: POSTGRES_DB=ezlaunch_staging, NODE_ENV=staging
nano ~/ezl-staging/.env.staging

# 3. Первый деплой через workflow_dispatch (Actions → Deploy Staging → Run workflow)
#    Или вручную после первого merge в main
```

## .env.staging — обязательные отличия от .env

```env
POSTGRES_DB=ezlaunch_staging
NODE_ENV=staging
# Остальное можно оставить из .env (POSTGRES_USER, POSTGRES_PASSWORD, APP_SECRET, SMTP_* и т.д.)
# FRONTEND_URL при необходимости менять на staging URL
```

## Управление staging-стеком

```bash
ssh <DEPLOY_USER>@<STAGING_HOST> -p <SSH_PORT>
cd ~/ezl-staging

# Статус
docker compose -f docker-compose.staging.yml -p ezl-staging ps

# Логи
docker compose -f docker-compose.staging.yml -p ezl-staging logs -f

# Остановить
docker compose -f docker-compose.staging.yml -p ezl-staging down

# Пересобрать вручную
docker compose -f docker-compose.staging.yml -p ezl-staging up --build -d

# Health check
docker exec ezl-staging-caddy-1 wget -qO- http://node-app:3000/health
```

## GitHub Environments — настройка approvals для prod

Требуется для `deploy-prod.yml` (задача #3).

**Шаги:**
1. GitHub repo → Settings → Environments → **New environment**
2. Имя: `production`
3. **Required reviewers** → добавить @CTO и @DevOps (GitHub usernames)
4. Поставить галку **Prevent self-review** (один человек не может сам себе аппрувать)
5. Save

После этого любой запуск `deploy-prod.yml` через `workflow_dispatch` будет ждать явного approve от @CTO или @DevOps в интерфейсе Actions.

## Branch protection — main

Требуется для задачи #1.

**Шаги:**
1. GitHub repo → Settings → Branches → **Add branch ruleset** (или Add classic protection rule)
2. Branch name pattern: `main`
3. Включить:
   - ✅ **Require a pull request before merging**
   - ✅ **Required approving reviews**: 1
   - ✅ **Require status checks to pass**: добавить `CI / node`, `CI / python`, `CI / web`, `CI / gitleaks`
   - ✅ **Do not allow bypassing the above settings** (отключить bypass даже для администраторов)
4. Save

После этого прямые push в main будут заблокированы; только PR с 1+ approve и зелёным CI.

## Проверка работы staging

После первого деплоя:

```bash
# С VM
docker exec ezl-staging-caddy-1 wget -qO- http://node-app:3000/health

# Снаружи (если порт 8080 открыт в firewall/security group)
curl -k https://<STAGING_HOST>:8443/health/node
```

Убедиться что staging и prod — отдельные окружения:
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
# Должны быть: ezl-* (prod) и ezl-staging-* (staging) — без конфликтов
```

## Связанные файлы

- `docker-compose.staging.yml` — compose конфиг staging
- `Caddyfile.staging` — Caddy конфиг staging
- `.github/workflows/deploy-staging.yml` — auto-deploy на merge в main
- `.github/workflows/deploy-prod.yml` — manual prod deploy с approvals
- `docs/infra/postgres-backup.md` — backup-стратегия (касается только прод-БД)
