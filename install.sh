#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

EZL_USER="${EZL_USER:-ezl}"
SSH_PORT="${SSH_PORT:-2200}"
EZL_PUBKEY="${EZL_PUBKEY:-}"
SKIP_HARDENING="${SKIP_HARDENING:-0}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()      { echo -e "${GREEN}  ✓ $*${NC}"; }
info()    { echo -e "${CYAN}  → $*${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠ $*${NC}"; }
fail()    { echo -e "${RED}  ✗ $*${NC}"; exit 1; }
section() { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

[[ $EUID -ne 0 ]] && fail "Запустите скрипт от root: sudo bash install.sh"

section "EZ Launch Bootstrap — старт"
echo "  Дата: $(date '+%Y-%m-%d %H:%M:%S')"; echo "  Хост: $(hostname)"
echo "  Пользователь EZL: $EZL_USER"; echo "  SSH-порт: $SSH_PORT"

# Шаг 1 — Проверка ОС
section "Шаг 1 — Проверка ОС"
OS_ID=$(grep -oP '(?<=^ID=).+' /etc/os-release | tr -d '"')
OS_VER=$(grep -oP '(?<=^VERSION_ID=).+' /etc/os-release | tr -d '"')
OS_MAJOR=${OS_VER%%.*}
case "$OS_ID" in
  ubuntu) [[ $OS_MAJOR -ge 20 ]] || fail "Ubuntu 20.04+ required (detected $OS_VER)" ;;
  debian) [[ $OS_MAJOR -ge 11 ]] || fail "Debian 11+ required (detected $OS_VER)" ;;
  *) warn "Неизвестная ОС: $OS_ID $OS_VER — продолжаем на свой страх" ;;
esac
ok "ОС: $OS_ID $OS_VER — поддерживается"

# Шаг 2 — Базовые пакеты
section "Шаг 2 — Базовые пакеты"
apt-get update -qq
apt-get install -y -qq curl wget git make ca-certificates gnupg lsb-release
ok "Пакеты установлены"

# Шаг 3 — DNS
section "Шаг 3 — DNS (8.8.8.8 / 1.1.1.1)"
NETPLAN_FILE=$(find /etc/netplan -name '*.yaml' 2>/dev/null | head -1 || true)
if [[ -n "$NETPLAN_FILE" ]]; then
  if ! grep -q "nameservers" "$NETPLAN_FILE"; then
    sed -i '/dhcp4:/a\            nameservers:\n              addresses: [8.8.8.8, 1.1.1.1]' "$NETPLAN_FILE"
    netplan apply 2>/dev/null || true
    ok "DNS прописан через netplan"
  else
    ok "DNS уже настроен в netplan — пропускаем"
  fi
else
  if ! grep -q "8.8.8.8" /etc/resolv.conf 2>/dev/null; then
    printf "nameserver 8.8.8.8\nnameserver 1.1.1.1\n" >> /etc/resolv.conf
  fi
  ok "DNS прописан в /etc/resolv.conf (fallback)"
fi

# Шаг 4 — Пользователь
section "Шаг 4 — Пользователь $EZL_USER"
if id "$EZL_USER" &>/dev/null; then
  ok "Пользователь $EZL_USER уже существует — пропускаем"
else
  useradd -m -s /bin/bash "$EZL_USER"
  usermod -aG sudo "$EZL_USER" 2>/dev/null || true
  # sudoers.d может не существовать в контейнере — создаём
  mkdir -p /etc/sudoers.d
  echo "$EZL_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$EZL_USER"
  chmod 440 "/etc/sudoers.d/$EZL_USER"
  ok "Пользователь $EZL_USER создан"
fi
SSH_DIR="/home/$EZL_USER/.ssh"; AUTH_KEYS="$SSH_DIR/authorized_keys"
mkdir -p "$SSH_DIR"; chmod 700 "$SSH_DIR"; chown "$EZL_USER:$EZL_USER" "$SSH_DIR"
if [[ -n "$EZL_PUBKEY" ]]; then
  grep -qF "$EZL_PUBKEY" "$AUTH_KEYS" 2>/dev/null || { echo "$EZL_PUBKEY" >> "$AUTH_KEYS"; chmod 600 "$AUTH_KEYS"; chown "$EZL_USER:$EZL_USER" "$AUTH_KEYS"; }
  ok "SSH public key в authorized_keys"
else
  warn "EZL_PUBKEY не задан — добавьте ключ вручную: echo '<pubkey>' >> $AUTH_KEYS"
fi

# Шаг 5 — Docker
section "Шаг 5 — Docker"
if command -v docker &>/dev/null; then
  ok "Docker уже установлен: $(docker --version | grep -oP '[\d.]+' | head -1) — пропускаем"
else
  info "Устанавливаем Docker..."
  curl -fsSL https://get.docker.com | sh
  ok "Docker установлен"
fi
groups "$EZL_USER" | grep -q docker || usermod -aG docker "$EZL_USER"
# systemctl может не работать в контейнере — пропускаем без ошибки
systemctl enable docker --quiet 2>/dev/null || true
systemctl start docker 2>/dev/null || true
ok "Docker группа настроена"

# Шаг 6 — Docker Compose
section "Шаг 6 — Docker Compose plugin"
if docker compose version &>/dev/null; then
  ok "Docker Compose plugin уже установлен"
else
  apt-get install -y -qq docker-compose-plugin && ok "Docker Compose plugin установлен"
fi

# Шаг 7 — UFW
section "Шаг 7 — UFW Firewall"
if command -v ufw &>/dev/null; then
  ufw allow "$SSH_PORT/tcp" comment 'EZL SSH' 2>/dev/null || true
  ufw allow 80/tcp   comment 'HTTP'     2>/dev/null || true
  ufw allow 443/tcp  comment 'HTTPS'    2>/dev/null || true
  [[ "$SSH_PORT" != "22" ]] && { ufw allow 22/tcp comment 'SSH standard' 2>/dev/null || true; }
  ufw --force enable 2>/dev/null || true
  ok "UFW настроен"
else
  warn "UFW не найден — пропускаем (установите вручную)"
fi

# Шаг 8 — SSH Hardening
section "Шаг 8 — SSH Hardening"
if [[ "$SKIP_HARDENING" == "1" ]]; then
  warn "SKIP_HARDENING=1 — пропускаем"
elif [[ ! -f /etc/ssh/sshd_config ]]; then
  warn "sshd_config не найден (контейнер?) — пропускаем hardening"
else
  SSHD_CFG="/etc/ssh/sshd_config"; CHANGED=0
  grep -qP "^Port\s+$SSH_PORT" "$SSHD_CFG"           || { sed -i "s/^#\?Port .*/Port $SSH_PORT/"                       "$SSHD_CFG"; ok "SSH Port → $SSH_PORT";         CHANGED=1; }
  grep -qP "^PermitRootLogin\s+no" "$SSHD_CFG"        || { sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'         "$SSHD_CFG"; ok "PermitRootLogin → no";         CHANGED=1; }
  grep -qP "^PasswordAuthentication\s+no" "$SSHD_CFG" || { sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CFG"; ok "PasswordAuthentication → no"; CHANGED=1; }
  if id "ubuntu" &>/dev/null; then
    passwd -S ubuntu 2>/dev/null | grep -q " L " || { usermod -L ubuntu; ok "ubuntu заблокирован"; CHANGED=1; }
  fi
  if [[ $CHANGED -eq 1 ]]; then
    systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || true
    ok "SSH перезапущен"
  else
    ok "SSH hardening уже применён"
  fi
fi

# Шаг 9 — Smoke-test
section "Шаг 9 — Smoke-test"
if command -v docker &>/dev/null; then
  docker run --rm hello-world 2>&1 | grep -q "Hello from Docker" && ok "Docker smoke-test: PASS ✅" || warn "Docker smoke-test пропущен (нет доступа к демону)"
else
  warn "Docker не установлен — smoke-test пропущен"
fi

# Итог
section "Итог"
echo "  🖥  Хост:      $(hostname)"
echo "  🌐  IP:        $(hostname -I 2>/dev/null | awk '{print $1}' || echo 'n/a')"
echo "  👤  EZL user:  $EZL_USER"
echo "  🔑  SSH port:  $SSH_PORT"
command -v docker &>/dev/null && echo "  🐳  Docker:    $(docker --version | grep -oP '[\d.]+' | head -1)" || true
echo "  🔒  Firewall:  UFW configured"
[[ "$SKIP_HARDENING" != "1" ]] && echo "  🛡️  Hardening:  applied" || true
echo ""
echo -e "${GREEN}  ✅ EZ Launch bootstrap завершён!${NC}"
echo -e "  Следующий шаг: задеплоить EZL core → make up"
