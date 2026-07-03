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
# 1) فحص المتطلبات
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
# 2) نسخ .env.example → .env إن لم يوجد
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
  local esc; esc=$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s/^${key}=.*/${key}=${esc}/" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

prompt() {
  local var="$1" msg="$2" silent="${3:-}" input=""
  if [ "$silent" = "silent" ]; then
    read -r -s -p "$(echo -e "${CYAN}?${NC} ${msg}: ")" input; echo
  else
    read -r -p "$(echo -e "${CYAN}?${NC} ${msg}: ")" input
  fi
  set_env_var "$var" "$input"
}

# ═══════════════════════════════════════════
# 3) اختيار الشبكات + أسئلة ذات صلة فقط
# ═══════════════════════════════════════════
SELECTED=""
select_networks() {
  echo
  info "Which networks do you want to run? (space-separated numbers, e.g: 1 2 3)"
  echo "   ── Crypto earning networks ──────────────────"
  echo "   1) mysterium     (bandwidth proxy  — earns MYST)"
  echo "   2) storj         (storage sharing  — earns STORJ)"
  echo "   3) bitping       (network monitor  — earns NOIA) ✅ live earnings"
  echo "   4) nodepay       (AI bandwidth     — earns NC tokens)"
  echo ""
  echo "   ── USD earning networks ─────────────────────"
  echo "   5) honeygain     (bandwidth sharing — earns USD) ✅ live earnings"
  echo "   6) traffmonetizer(bandwidth sharing — earns USD)"
  echo "   7) iproyal       (bandwidth sharing — earns USD)"
  echo "   8) peer2profit   (bandwidth sharing — earns USD)"
  echo "   9) repocket      (bandwidth sharing — earns USD)"
  echo "  10) earnapp       (bandwidth sharing — earns USD)"
  echo ""
  local choice; read -r -p "$(echo -e "${CYAN}?${NC} Selection [default: 1 2 5]: ")" choice
  choice="${choice:-1 2 5}"
  local nets=""
  for c in $choice; do
    case "$c" in
      1)  nets="${nets}mysterium,";;
      2)  nets="${nets}storj,";;
      3)  nets="${nets}bitping,";;
      4)  nets="${nets}nodepay,";;
      5)  nets="${nets}honeygain,";;
      6)  nets="${nets}traffmonetizer,";;
      7)  nets="${nets}iproyal,";;
      8)  nets="${nets}peer2profit,";;
      9)  nets="${nets}repocket,";;
      10) nets="${nets}earnapp,";;
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

  if [[ ",$SELECTED," == *",honeygain,"* ]]; then
    echo; info "Honeygain settings"
    prompt "HONEYGAIN_EMAIL" "Honeygain email"
    prompt "HONEYGAIN_PASS"  "Honeygain password" silent
  fi

  if [[ ",$SELECTED," == *",traffmonetizer,"* ]]; then
    echo; info "Traffmonetizer settings"
    prompt "TRAFFMONETIZER_TOKEN" "Traffmonetizer token (from dashboard)"
  fi

  if [[ ",$SELECTED," == *",iproyal,"* ]]; then
    echo; info "IPRoyal Pawns settings"
    prompt "IPROYAL_EMAIL" "IPRoyal email"
    prompt "IPROYAL_PASS"  "IPRoyal password" silent
  fi

  if [[ ",$SELECTED," == *",peer2profit,"* ]]; then
    echo; info "Peer2Profit settings"
    prompt "PEER2PROFIT_EMAIL" "Peer2Profit email"
  fi

  if [[ ",$SELECTED," == *",repocket,"* ]]; then
    echo; info "Repocket settings"
    prompt "REPOCKET_EMAIL"   "Repocket email"
    prompt "REPOCKET_API_KEY" "Repocket API key"
  fi

  if [[ ",$SELECTED," == *",earnapp,"* ]]; then
    echo; info "EarnApp settings"
    info "Generate your UUID at: https://earnapp.com/i/sdk-node-uuid"
    prompt "EARNAPP_UUID" "EarnApp UUID (sdk-node-...)"
  fi

  if [[ ",$SELECTED," == *",bitping,"* ]]; then
    echo; info "Bitping settings"
    prompt "BITPING_EMAIL"    "Bitping email"
    prompt "BITPING_PASSWORD" "Bitping password" silent
  fi

  if [[ ",$SELECTED," == *",nodepay,"* ]]; then
    echo; info "Nodepay settings"
    info "Get your token at: https://app.nodepay.ai → Settings → API Token"
    prompt "NODEPAY_TOKEN" "Nodepay API token"
  fi
}

# ═══════════════════════════════════════════
# 4) التحقق ثم التشغيل
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
  [[ ",$SELECTED," == *",mysterium,"*    ]] && check "MYST_IDENTITY_PASSPHRASE"
  [[ ",$SELECTED," == *",storj,"*        ]] && { check "STORJ_WALLET"; check "STORJ_EMAIL"; }
  [[ ",$SELECTED," == *",honeygain,"*    ]] && { check "HONEYGAIN_EMAIL"; check "HONEYGAIN_PASS"; }
  [[ ",$SELECTED," == *",traffmonetizer,"* ]] && check "TRAFFMONETIZER_TOKEN"
  [[ ",$SELECTED," == *",iproyal,"*      ]] && { check "IPROYAL_EMAIL"; check "IPROYAL_PASS"; }
  [[ ",$SELECTED," == *",peer2profit,"*  ]] && check "PEER2PROFIT_EMAIL"
  [[ ",$SELECTED," == *",repocket,"*     ]] && { check "REPOCKET_EMAIL"; check "REPOCKET_API_KEY"; }
  [[ ",$SELECTED," == *",earnapp,"*      ]] && check "EARNAPP_UUID"
  [[ ",$SELECTED," == *",bitping,"*      ]] && { check "BITPING_EMAIL"; check "BITPING_PASSWORD"; }
  [[ ",$SELECTED," == *",nodepay,"*      ]] && check "NODEPAY_TOKEN"
  [[ ",$SELECTED," == *",grass,"*        ]] && { check "GRASS_USER"; check "GRASS_PASS"; }
  [[ ",$SELECTED," == *",packetstream,"* ]] && check "PACKETSTREAM_CID"
  [[ ",$SELECTED," == *",meson,"*        ]] && check "MESON_TOKEN"
  [[ ",$SELECTED," == *",gradient,"*     ]] && { check "GRADIENT_EMAIL"; check "GRADIENT_PASS"; }
  [[ ",$SELECTED," == *",proxyrack,"*    ]] && { check "PROXYRACK_UUID"; check "PROXYRACK_API_KEY"; }
  [[ ",$SELECTED," == *",uprock,"*       ]] && { check "UPROCK_EMAIL"; check "UPROCK_PASSWORD"; }
  [[ ",$SELECTED," == *",huddle01,"*     ]] && check "HUDDLE01_API_KEY"
  [[ ",$SELECTED," == *",titan,"*        ]] && check "TITAN_HASH"
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
