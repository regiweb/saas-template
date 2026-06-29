# GitHub Secrets — EZL-008
Требуются для `deploy.yml`. Настроить в: Settings → Secrets and variables → Actions → New repository secret.

> ⚠️ Реальные значения — только в private vault (`Security/CREDENTIALS.md`). В этом публичном репо —
> только имена секретов и плейсхолдеры. Никогда не вставляй сюда хост/порт/пользователя/ключ.

| Secret | Значение (источник) |
|---|---|
| `SSH_HOST` | `<STAGING_HOST>` — из vault |
| `SSH_PORT` | `<SSH_PORT>` — из vault |
| `SSH_USER` | `<DEPLOY_USER>` — из vault |
| `SSH_PRIVATE_KEY` | содержимое приватного ключа `~/.ssh/<SSH_KEY>` (весь файл) |
| `SSH_PASSPHRASE` | значение `EZL_SSH_PASSPHRASE` из локального окружения |

## Получить SSH_PRIVATE_KEY

```powershell
# Windows — вывести содержимое ключа в терминал, скопировать в секрет
Get-Content "$env:USERPROFILE\.ssh\<SSH_KEY>" | Set-Clipboard
```

Включая строки `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`.

## Проверить после настройки

```bash
# Ручной запуск деплоя через GitHub UI:
# Actions → Deploy → Run workflow → main
```
