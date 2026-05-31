# saas-template

Универсальный шаблон для запуска SaaS-проекта. Node.js + Python + PostgreSQL в Docker Compose.

## Быстрый старт

```bash
git clone git@github.com:YOUR_USERNAME/saas-template.git my-project
cd my-project
cp .env.example .env
make up
```

Сервисы:
- Node: http://localhost:3000/health
- Python: http://localhost:8000/health
- Caddy proxy: http://localhost

## Команды

| Команда | Действие |
|---------|----------|
| `make up` | Поднять все сервисы |
| `make down` | Остановить |
| `make logs` | Логи всех сервисов |
| `make build` | Пересобрать образы |
| `make shell-node` | Shell внутри Node-контейнера |
| `make shell-python` | Shell внутри Python-контейнера |

## Структура

```
saas-template/
├── services/
│   ├── node-app/       # Node.js 22 + Fastify
│   └── python-app/     # Python 3.12 + FastAPI
├── .github/workflows/  # CI: lint + test + Trivy
├── docker-compose.yml
├── Caddyfile
├── Makefile
└── .env.example
```

## CI/CD

Каждый PR в `main`/`develop` запускает:
1. Lint + тесты (Node и Python)
2. Docker build
3. Trivy security scan (блокирует HIGH/CRITICAL)
4. Gitleaks secret scan
# smoke test Sun May 31 13:01:11 MSK 2026
