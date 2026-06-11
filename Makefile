.PHONY: up down logs build test shell-node shell-python

up:
	cp -n .env.example .env 2>/dev/null || true
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

test:
	docker compose run --rm node-app npm test
	docker compose run --rm python-app pytest

shell-node:
	docker compose exec node-app sh

shell-python:
	docker compose exec python-app bash
