#!/usr/bin/env bash
# ═══════════════════════════════════════════
# NodePIN — One-command setup
# Usage: ./setup.sh
# يأخذك من الاستنساخ إلى التشغيل والربح بخطوة واحدة.
# ═══════════════════════════════════════════
set -euo pipefail

# ── ألوان ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✔${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
err()   { echo -e "${RED}✖${NC}  $*" >&2; }
die()   { err "$*"; exit 1; }

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo -e "${CYAN}══════════════════════════════${NC}"
echo -e "${CYAN}   NodePIN — Setup${NC}"
echo -e "${CYAN}══════════════════════════════${NC}"

# ═══════════════════════════════════════════
# 1) فحص المتطلبات (#9)
# ═══════════════════════════════════════════
check_prereqs() {
  info "Checking prerequisites..."
  if ! command -v docker >/dev/null 2>&1; then
    die "Docker is not installed. Install it: https://docs.docker.com/engine/install/"
  fi
  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose (v2) is not available. Install the Docker Compose plugin."
  fi
  if ! docker info >/dev/null 2>&1; then
    die "Docker daemon is not running (or needs sudo). Start Docker and retry."
  fi
  ok "Docker and Docker Compose are ready."
}

# ═══════════════════════════════════════════
# 2) نسخ .env.example → .env إن لم يوجد (#10)
# ═══════════════════════════════════════════
prepare_env() {
  [ -f "$ENV_EXAMPLE" ] || die "$ENV_EXAMPLE not found. Run from the project root."
  if [ -f "$ENV_FILE" ]; then
    warn "$ENV_FILE already exists — keeping your existing secrets untouched."
  else
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    ok "Created $ENV_FILE from template."
  fi
}

# ── أداة مساعدة: اكتب/حدّث متغير داخل .env ──
set_env_var() {
  local key="$1" value="$2"
  # هرّب المحارف الخاصة لـ sed
  local esc; esc=$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s/^${key}=.*/${key}=${esc}/" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

prompt() {
  # prompt <var> <message> [silent]
  local var="$1" msg="$2" silent="${3:-}" input=""
  if [ "$silent" = "silent" ]; then
    read -r -s -p "$(echo -e "${CYAN}?${NC} ${msg}: ")" input; echo
  else
    read -r -p "$(echo -e "${CYAN}?${NC} ${msg}: ")" input
  fi
  set_env_var "$var" "$input"
}

# ═══════════════════════════════════════════
# 3) اختيار الشبكات + أسئلة ذات صلة فقط (#11)
# ═══════════════════════════════════════════
SELECTED=""
select_networks() {
  echo
  info "Which networks do you want to run? (space-separated numbers)"
  echo "   1) mysterium  (shares bandwidth — earns MYST)"
  echo "   2) storj      (shares storage   — earns STORJ)"
  local choice; read -r -p "$(echo -e "${CYAN}?${NC} Selection [default: 1 2]: ")" choice
  choice="${choice:-1 2}"
  local nets=""
  for c in $choice; do
    case "$c" in
      1) nets="${nets}mysterium,";;
      2) nets="${nets}storj,";;
      *) warn "Ignoring unknown option: $c";;
    esac
  done
  nets="${nets%,}"
  [ -n "$nets" ] || die "No valid network selected."
  SELECTED="$nets"
  set_env_var "ENABLED_NETWORKS" "$SELECTED"
  ok "Enabled networks: $SELECTED"
}

collect_vars() {
  echo
  info "Global settings"
  prompt "NODEPIN_VPS_IP" "Your server public IP"

  echo; info "Dashboard security"
  prompt "DASHBOARD_PASSWORD" "Dashboard login password (leave empty to disable auth)" silent
  # ولّد سر جلسة عشوائي تلقائياً
  if command -v openssl >/dev/null 2>&1; then
    set_env_var "SESSION_SECRET" "$(openssl rand -hex 32)"
  else
    set_env_var "SESSION_SECRET" "$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  ok "Generated a random SESSION_SECRET."

  if [[ ",$SELECTED," == *",mysterium,"* ]]; then
    echo; info "Mysterium settings"
    prompt "MYST_IDENTITY_PASSPHRASE" "Mysterium identity passphrase" silent
  fi

  if [[ ",$SELECTED," == *",storj,"* ]]; then
    echo; info "Storj settings"
    prompt "STORJ_WALLET" "Storj payout wallet (Ethereum address)"
    prompt "STORJ_EMAIL"  "Storj email"
  fi
}

# ═══════════════════════════════════════════
# 4) التحقق ثم التشغيل (#12)
# ═══════════════════════════════════════════
get_val() { grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2-; }

validate() {
  info "Validating required values..."
  local missing=0
  check() {
    local key="$1" val; val=$(get_val "$key")
    if [ -z "$val" ] || [[ "$val" == your_* ]]; then
      err "Missing/placeholder value: $key"; missing=1
    fi
  }
  check "NODEPIN_VPS_IP"
  if [[ ",$SELECTED," == *",mysterium,"* ]]; then check "MYST_IDENTITY_PASSPHRASE"; fi
  if [[ ",$SELECTED," == *",storj,"* ]]; then check "STORJ_WALLET"; check "STORJ_EMAIL"; fi
  [ "$missing" -eq 0 ] || die "Fix the values above in $ENV_FILE (or re-run setup) and try again."
  ok "All required values present."
}

launch() {
  echo
  info "Starting NodePIN..."
  if command -v make >/dev/null 2>&1; then
    make up
  else
    warn "'make' not found — falling back to docker compose directly."
    local flags=""
    IFS=',' read -ra arr <<< "$SELECTED"
    for n in "${arr[@]}"; do flags="$flags --profile $n"; done
    # shellcheck disable=SC2086
    docker compose $flags up -d
    local ip port; ip=$(get_val NODEPIN_VPS_IP); port=$(get_val DASHBOARD_PORT); port=${port:-3000}
    ok "NodePIN is up. Dashboard: http://${ip}:${port}"
  fi
}

# ── التدفق ──
check_prereqs
prepare_env
select_networks
collect_vars
validate
launch
echo
ok "Done. Happy earning! 🌐"
