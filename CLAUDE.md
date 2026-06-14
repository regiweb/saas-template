# EZ Launch — CLAUDE.md

## Project

EZ Launch v0.1.0 — SaaS platform core. Task tracker prefix: **EZL-**.

## Stack

- **node-app** (`services/node-app/`) — Node.js 22 + Fastify, main REST API, port 3000
- **python-app** (`services/python-app/`) — Python 3.12 + FastAPI, AI/worker service, port 8000
- **postgres** — PostgreSQL 16, primary DB
- **redis** — Redis 7, cache + task queues
- **caddy** — reverse proxy, routes `/api/*` → node, `/ai/*` → python

## Essential commands

```bash
make up          # start everything (copies .env.example if .env missing)
make down        # stop
make logs        # stream all logs
make test        # run Node + Python test suites inside containers
make shell-node  # sh into node-app
make shell-python # bash into python-app
```

Validate compose before committing changes:
```bash
docker compose config
```

## Environment

Copy `.env.example` → `.env` and set:
- `POSTGRES_PASSWORD` — required, no default in compose
- `APP_SECRET` — required for production

## Conventions

- Keep services independent — no direct service-to-service calls, use queues (Redis)
- Health endpoint on every service: `GET /health` → `{"status":"ok","service":"<name>","version":"<semver>"}`
- Secrets go in `.env` (gitignored), never hardcoded
- CI runs on every PR: lint → test → docker build → trivy → gitleaks

## Deploy pipeline (v0.2.0)

```
feature branch → PR (1+ approve) → CI gate → merge to main
  → auto-deploy to staging (deploy-staging.yml, ports 8080/8443)
  → manual QA on staging
  → workflow_dispatch → deploy-prod.yml (requires "production" environment approval)
```

- **Staging**: auto-deploys on every CI-green merge to `main` — `~/ezl-staging/` on VM, ports 8080/8443
- **Prod**: manual only — `deploy-prod.yml` via `workflow_dispatch`, requires approve in GitHub Environment `production`
- **Rollback**: prod images tagged `:rollback` before every update; restore with `docker tag ... :latest && docker compose up -d --no-build`
- **Branch protection**: PR required on `main`, 1+ approve, CI must pass — see `docs/infra/staging-setup.md`
- **Postgres backup**: daily `pg_dump` at 03:00 UTC via cron, retention 7 days — see `docs/infra/postgres-backup.md`

## Task tracking

Tasks use `EZL-NNN` identifiers. Current milestone: v0.1.0 — core infrastructure.

## Commit Convention

Всегда использовать Conventional Commits:
```
<type>(<scope>): <EZL-XXX> — <description>
```

Типы: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`
Scope: модуль или папка (`cli`, `auth`, `admin`, `infra`, `ci`)

Примеры:
```
feat(cli): EZL-015 — add ezl deploy command with SSH and Docker compose
fix(security): EZL-SEC-001 — passphrase env, http redirect, docker filter scope
feat(auth): EZL-017 — register, login, JWT refresh, forgot password
```

Коммит делать после завершения задачи, до сохранения лога сессии.

## Code Session Log

After completing any task, save a session log to:
`F:\Install\Obsidian\storage\Olegzam\Claude Work\3. Projects\1. AI Dev Team\01. Projects\02. Commercial Products\01. EZ Launch\01. Development\Code Sessions\<TICKET-ID>.md`

Format:
```markdown
# Code Session — <TICKET-ID> · <title>
`Session-<TICKET-ID>` | <date>

## Задача
<one line>

## Изменённые файлы
| Файл | Что сделано |
|------|-------------|
| ...  | ...         |

## Команды
```bash
# команды которые выполнялись
```

## Ошибки и решения
| Ошибка | Решение |
|--------|---------|
| ...    | ...     |

## Итог
✅ / ❌ + одна строка результата
```
