# Postgres Backup — EZL

> Задача: HOTFIX / CI_CD_STRATEGY.md п.7 #6  
> Обновлено: 2026-06-14

## Обзор

| Параметр | Значение |
|---|---|
| Инструмент | `pg_dump` (логический бэкап) |
| Формат | SQL + gzip (`.sql.gz`) |
| Хранение | `~/ezl/backups/` на VM (вне Docker-volumes) |
| Расписание | Ежедневно в 03:00 UTC (cron) |
| Retention | 7 дней |
| Скрипт | `scripts/postgres-backup.sh` |
| Восстановление | `scripts/postgres-restore.sh` |

**Почему `pg_dump`, а не volume snapshot:**
- Volume snapshot требует остановки контейнера или filesystem freeze; `pg_dump` работает на живой БД без простоя
- SQL-формат переносим между версиями Postgres и позволяет точечное восстановление (отдельные таблицы, диапазоны)
- Легко верифицировать: `.sql.gz` можно вычитать без запуска Postgres

## Первоначальная настройка на VM

Выполняется один раз через SSH (`ssh -p 2200 ezl@178.236.25.13`):

```bash
# 1. Создать директории
mkdir -p ~/ezl/backups ~/ezl/logs

# 2. Убедиться, что скрипт развёрнут (автоматически при следующем деплое)
#    Или вручную для немедленного старта:
mkdir -p ~/ezl/scripts
# скопировать scripts/postgres-backup.sh и postgres-restore.sh из репо

# 3. Установить права на выполнение
chmod +x ~/ezl/scripts/postgres-backup.sh ~/ezl/scripts/postgres-restore.sh

# 4. Добавить переменные окружения в cron (читает .env)
# Если POSTGRES_USER и POSTGRES_DB отличаются от дефолтов (ezl / ezlaunch) —
# добавить POSTGRES_USER= и POSTGRES_DB= в начало crontab

# 5. Добавить задачу в crontab
crontab -e
```

Содержимое cron-записи:
```cron
# Postgres backup — daily 03:00 UTC
0 3 * * * /home/ezl/ezl/scripts/postgres-backup.sh >> /home/ezl/ezl/logs/backup.log 2>&1
```

После добавления — проверить запуск вручную:
```bash
~/ezl/scripts/postgres-backup.sh
ls -lh ~/ezl/backups/
tail ~/ezl/logs/backup.log
```

## Деплой скрипта

`scripts/postgres-backup.sh` и `scripts/postgres-restore.sh` включены в SCP-деплой (`deploy.yml` → source `scripts/`). При каждом деплое файлы актуализируются на VM в `~/ezl/scripts/`. Права на выполнение нужно выставить один раз при первоначальной настройке (SCP не сохраняет chmod).

## Retention policy

| Параметр | Значение |
|---|---|
| Хранить | 7 последних ежедневных дампов |
| Старше 7 дней | удаляются автоматически при следующем успешном бэкапе |
| Ожидаемый размер | зависит от данных; в dev-фазе <<1 MB, следить при росте данных |
| Мониторинг | `ls -lh ~/ezl/backups/` + `tail ~/ezl/logs/backup.log` |

Изменить retention: переменная `RETENTION_DAYS` в `scripts/postgres-backup.sh`.

## Процедура восстановления

### Быстрый старт

```bash
ssh -p 2200 ezl@178.236.25.13
~/ezl/scripts/postgres-restore.sh ~/ezl/backups/ezlaunch_<timestamp>.sql.gz
```

Скрипт запросит подтверждение, остановит app-контейнеры, пересоздаст БД, применит дамп, перезапустит контейнеры.

### Пошагово (вручную, если скрипт недоступен)

```bash
ssh -p 2200 ezl@178.236.25.13
cd ~/ezl

# 1. Остановить app (чтобы не было записей во время restore)
docker compose stop node-app python-app

# 2. Выбрать бэкап
ls -lth ~/ezl/backups/ | head

# 3. Пересоздать БД
docker exec ezl-postgres-1 psql -U ezl -c "DROP DATABASE IF EXISTS ezlaunch;"
docker exec ezl-postgres-1 psql -U ezl -c "CREATE DATABASE ezlaunch OWNER ezl;"

# 4. Восстановить
gunzip -c ~/ezl/backups/ezlaunch_<timestamp>.sql.gz \
  | docker exec -i ezl-postgres-1 psql -U ezl ezlaunch

# 5. Запустить app обратно
docker compose start node-app python-app

# 6. Health check
docker exec ezl-caddy-1 wget -qO- http://node-app:3000/health
```

### Важно: миграции и backward-compatibility

Rollback кода **не включает** автоматический rollback схемы БД. Если откатываемый код создал новые таблицы/колонки — старый код продолжит работать (expand/contract паттерн). Если миграция несовместима — сначала определить правильный целевой бэкап, затем выполнить restore, затем откатить код.

Правило: **старый код должен работать с новой схемой минимум 1 релиз**. Нарушение этого правила превращает rollback из рутинной операции в аварийную.

## Проверка бэкапов

```bash
# Список бэкапов с размерами
ls -lth ~/ezl/backups/

# Лог последних запусков
tail -20 ~/ezl/logs/backup.log

# Ручная проверка дампа (без восстановления)
gunzip -c ~/ezl/backups/ezlaunch_<timestamp>.sql.gz | head -20
```

Рекомендуется: раз в месяц делать тестовый restore на staging-копии и проверять целостность данных.

## Ограничения (текущая реализация)

| Ограничение | Статус | FR |
|---|---|---|
| Бэкапы хранятся на той же VM что и прод | приемлемо для текущего масштаба | FR-002: offsite (S3 / другой хост) при появлении SLA |
| Нет мониторинга успешности бэкапов | нет алертов при сбое | FR-003: Slack/email notify при exit code != 0 |
| Retention только по времени (не по размеру) | ok при текущих размерах | пересмотреть при данных >1 GB |

### FR-002 — Offsite backup

При появлении платящих пользователей или SLA на RPO: добавить `aws s3 cp` или `rclone` в конец `postgres-backup.sh` для синхронизации бэкапов в внешнее хранилище. Обсуждение — @CTO/@DevOps при срабатывании триггера.

### FR-003 — Alert при сбое

Добавить `|| notify_failure` в cron-запись или trap в скрипте для отправки alert-а (email/Slack) если бэкап не удался. Реализовать при появлении on-call дежурства.

## Связанные документы

- `scripts/postgres-backup.sh` — скрипт бэкапа
- `scripts/postgres-restore.sh` — скрипт восстановления
- `CI_CD_STRATEGY.md` п.6.2 — план отката (prod rollback + backup)
- `docs/infra/vm-state.md` — состояние VM
