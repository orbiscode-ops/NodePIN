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
  echo "   3) nym           (mixnet node      — earns NYM)"
  echo "   4) nkn           (relayer node     — earns NKN)"
  echo ""
  echo "   ── USD earning networks ─────────────────────"

  echo "   5) traffmonetizer(bandwidth sharing — earns USD)"
  echo "   6) anyone        (onion relay      — earns ATOR/ANYONE)"
  echo "   7) blockmesh     (decentralized AI  — earns POINTS)"
  echo ""
  local choice; read -r -p "$(echo -e "${CYAN}?${NC} Selection [default: 1 5 6]: ")" choice
  choice="${choice:-1 5 6}"
  local nets=""
  for c in $choice; do
    case "$c" in
      1)  nets="${nets}mysterium,";;
      2)  nets="${nets}storj,";;
      3)  nets="${nets}nym,";;
      4)  nets="${nets}nkn,";;

      5)  nets="${nets}traffmonetizer,";;
      6)  nets="${nets}anyone,";;
      7)  nets="${nets}blockmesh,";;
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
    prompt "MYST_API_PASSWORD" "Mysterium Node UI password (default: mystberry)" silent
  fi

  if [[ ",$SELECTED," == *",storj,"* ]]; then
    echo; info "Storj settings"
    prompt "STORJ_WALLET" "Storj payout wallet (Ethereum address)"
    prompt "STORJ_EMAIL"  "Storj email"
  fi


  if [[ ",$SELECTED," == *",traffmonetizer,"* ]]; then
    echo; info "Traffmonetizer settings"
    prompt "TRAFFMONETIZER_TOKEN" "Traffmonetizer token (from dashboard)"
  fi



  if [[ ",$SELECTED," == *",anyone,"* ]]; then
    echo; info "Anyone Protocol settings"
    prompt "ANYONE_NICKNAME" "Anyone relay nickname (default: nodepin)"
    prompt "ANYONE_WALLET"   "Anyone payout Ethereum wallet address"
    prompt "ANYONE_PORT"     "Anyone relay ORPort (default: 9001)"
  fi

  if [[ ",$SELECTED," == *",nym,"* ]]; then
    echo; info "Nym Network settings"
    prompt "NYM_NODE_ID" "Nym Node ID (default: default-nym-node)"
  fi

  if [[ ",$SELECTED," == *",nkn,"* ]]; then
    echo; info "NKN settings"
    prompt "NKN_BENEFICIARY_ADDR" "NKN beneficiary wallet address (to receive rewards)"
    prompt "NKN_WALLET_PASSWORD"  "Password to encrypt the node's local wallet file" silent
  fi

  if [[ ",$SELECTED," == *",blockmesh,"* ]]; then
    echo; info "BlockMesh settings"
    prompt "BLOCKMESH_EMAIL"    "BlockMesh email"
    prompt "BLOCKMESH_PASSWORD" "BlockMesh password" silent
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

  [[ ",$SELECTED," == *",traffmonetizer,"* ]] && check "TRAFFMONETIZER_TOKEN"

  [[ ",$SELECTED," == *",proxyrack,"*    ]] && check "PROXYRACK_API_KEY"
  [[ ",$SELECTED," == *",anyone,"*       ]] && check "ANYONE_WALLET"
  [[ ",$SELECTED," == *",nkn,"*          ]] && { check "NKN_BENEFICIARY_ADDR"; check "NKN_WALLET_PASSWORD"; }
  [[ ",$SELECTED," == *",blockmesh,"*    ]] && { check "BLOCKMESH_EMAIL"; check "BLOCKMESH_PASSWORD"; }
  [ "$missing" -eq 0 ] || die "Fix the values above in $ENV_FILE (or re-run setup) and try again."
  ok "All required values present."
}

launch() {
  echo
  if [[ ",$SELECTED," == *",anyone,"* ]]; then
    local nick; nick=$(get_val "ANYONE_NICKNAME")
    local wallet; wallet=$(get_val "ANYONE_WALLET")
    nick="${nick:-nodepin}"
    wallet="${wallet:-0x0000000000000000000000000000000000000000}"

    mkdir -p services/anyone
    cat <<EOF > services/anyone/anonrc
User anond
DataDirectory /var/lib/anon
ControlSocket /var/lib/anon/control
ControlSocketsGroupWritable 1
CookieAuthentication 1
CookieAuthFile /var/lib/anon/control.authcookie
CookieAuthFileGroupReadable 1
Log notice file /var/lib/anon/notices.log
ORPort 9001
ExitRelay 0
Nickname ${nick}
ContactInfo @anon:${wallet}
AgreeToTerms 1
EOF
    ok "Generated Anyone Protocol anonrc configuration."
  fi

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
