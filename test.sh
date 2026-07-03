#!/usr/bin/env bash
# ═══════════════════════════════════════════
# NodePIN — Smoke test (run on the VPS after 'make up')
# يتحقق من: حاويات الشبكات المفعّلة تعمل، واللوحة ترد، وmetrics غير فارغة.
# ═══════════════════════════════════════════
set -uo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass=0; fail=0
ok()   { echo -e "${GREEN}✔${NC} $*"; pass=$((pass+1)); }
bad()  { echo -e "${RED}✖${NC} $*"; fail=$((fail+1)); }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

# حمّل .env
if [ -f .env ]; then set -a; . ./.env; set +a; fi
ENABLED_NETWORKS="${ENABLED_NETWORKS:-mysterium,storj}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
HOST="127.0.0.1"

echo "NodePIN smoke test — enabled: $ENABLED_NETWORKS"

# 1) control panel container running
if docker ps --format '{{.Names}}' | grep -q '^nodepin_control_panel$'; then
  ok "control-panel container is running"
else
  bad "control-panel container is NOT running"
fi

# 2) each enabled network container running
IFS=',' read -ra nets <<< "$ENABLED_NETWORKS"
for n in "${nets[@]}"; do
  case "$n" in
    mysterium) cname="nodepin_myst";;
    storj)     cname="nodepin_storj";;
    *)         cname="nodepin_${n}";;
  esac
  if docker ps --format '{{.Names}}' | grep -q "^${cname}$"; then
    ok "$n container ($cname) is running"
  else
    bad "$n container ($cname) is NOT running"
  fi
done

# 3) dashboard health
if curl -fsS "http://${HOST}:${DASHBOARD_PORT}/api/health" >/dev/null 2>&1; then
  ok "/api/health responds"
else
  bad "/api/health did not respond on port ${DASHBOARD_PORT}"
fi

# 4) metrics returns non-empty nodes
metrics=$(curl -fsS "http://${HOST}:${DASHBOARD_PORT}/api/metrics" 2>/dev/null || echo '')
if echo "$metrics" | grep -q '"nodes"'; then
  ok "/api/metrics returns data"
else
  warn "/api/metrics empty or unreachable (nodes may still be starting)"
fi

echo
echo "Result: ${pass} passed, ${fail} failed"
[ "$fail" -eq 0 ] || exit 1
