# GitHub Secrets — EZL-008
Требуются для `deploy.yml`. Настроить в: Settings → Secrets and variables → Actions → New repository secret.

| Secret | Значение |
|---|---|
| `SSH_HOST` | `178.236.25.13` |
| `SSH_PORT` | `2200` |
| `SSH_USER` | `ezl` |
| `SSH_PRIVATE_KEY` | содержимое `~/.ssh/ezl_ed25519` (приватный ключ, весь файл) |
| `SSH_PASSPHRASE` | значение `EZL_SSH_PASSPHRASE` из локального окружения |

## Получить SSH_PRIVATE_KEY

```powershell
# Windows — вывести содержимое ключа в терминал, скопировать в секрет
Get-Content C:\Users\Oleg\.ssh\ezl_ed25519 | Set-Clipboard
```

Включая строки `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`.

## Проверить после настройки

```bash
# Ручной запуск деплоя через GitHub UI:
# Actions → Deploy → Run workflow → main
```
