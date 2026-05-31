.PHONY: up down logs build shell-node shell-python

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

shell-node:
	docker compose exec node-app sh

shell-python:
	docker compose exec python-app bash
