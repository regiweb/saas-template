# EZ Launch

**v0.1.0** — Core infrastructure for EZ Launch SaaS platform.

Node.js API + Python AI/worker + PostgreSQL + Redis + Caddy in Docker Compose.

## Quick start

```bash
cp .env.example .env
# edit .env — set POSTGRES_PASSWORD and APP_SECRET
make up
```

Services:
- Main API: http://localhost/api/health
- AI worker: http://localhost/ai/health
- Node health: http://localhost/health/node
- Python health: http://localhost/health/python

## Commands

| Command | Action |
|---------|--------|
| `make up` | Build and start all services |
| `make down` | Stop all services |
| `make logs` | Stream logs |
| `make build` | Rebuild images |
| `make test` | Run test suites (Node + Python) |
| `make shell-node` | Shell into node-app |
| `make shell-python` | Shell into python-app |

## Stack

```
ez-launch/
├── services/
│   ├── node-app/       # Node.js 22 + Fastify  (main API)
│   └── python-app/     # Python 3.12 + FastAPI  (AI / worker)
├── .github/workflows/  # CI: lint + test + Trivy + Gitleaks
├── docker-compose.yml  # Caddy · PostgreSQL · Redis · apps
├── Caddyfile           # Reverse proxy config
├── Makefile
├── CLAUDE.md
└── .env.example
```

## Infrastructure

| Service | Image | Role |
|---------|-------|------|
| caddy | caddy:2-alpine | Reverse proxy / TLS |
| postgres | postgres:16-alpine | Primary database |
| redis | redis:7-alpine | Cache / queues |
| node-app | local build | Main API |
| python-app | local build | AI / worker |

## CI/CD

Every PR to `main`/`develop` runs:
1. Lint + tests (Node and Python)
2. Docker build
3. Trivy security scan (blocks HIGH/CRITICAL)
4. Gitleaks secret scan
