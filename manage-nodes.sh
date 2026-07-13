#!/bin/bash
# ═══════════════════════════════════════════
# Sentinel Multi-Node CLI Manager for NodePIN
# ═══════════════════════════════════════════

set -euo pipefail

# Ensure script is run with sudo/root privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script with sudo or as root."
  exit 1
fi

DATA_DIR="./data"
CONTAINER_IMAGE="ghcr.io/sentinel-official/sentinel-dvpnx:latest"

# Helper for colorful output
info() { echo -e "\e[34m[INFO]\e[0m $*"; }
success() { echo -e "\e[32m[SUCCESS]\e[0m $*"; }
error() { echo -e "\e[31m[ERROR]\e[0m $*"; }
warn() { echo -e "\e[33m[WARNING]\e[0m $*"; }

# ──────────────────────────────────────────
# Check System Dependencies
# ──────────────────────────────────────────
check_dependencies() {
  info "Checking system dependencies..."
  
  if [ -f /.dockerenv ]; then
    info "Detected running inside Docker container. Verifying CLI binaries..."
    if ! command -v docker &>/dev/null; then
      error "Docker CLI is missing in container. Make sure docker-cli is installed."
      exit 1
    fi
    if ! command -v jq &>/dev/null; then
      error "jq is missing in container."
      exit 1
    fi
    return 0
  fi

  if ! command -v docker &>/dev/null; then
    warn "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker || true
    systemctl enable docker || true
  fi

  if ! command -v ufw &>/dev/null; then
    warn "UFW is not installed. Installing UFW..."
    apt-get update && apt-get install -y ufw || true
  fi

  # Enable UFW if not active
  if command -v ufw &>/dev/null; then
    if ! ufw status | grep -q "active"; then
      info "Enabling UFW..."
      ufw allow 22/tcp comment 'SSH' || true
      echo "y" | ufw enable || true
    fi
  fi

  if ! command -v jq &>/dev/null; then
    info "Installing jq..."
    apt-get update && apt-get install -y jq || true
  fi
}

# ──────────────────────────────────────────
# Detect Default Public IP
# ──────────────────────────────────────────
detect_public_ip() {
  local ip
  ip=$(curl -s --max-time 5 https://api.ipify.org || curl -s --max-time 5 https://ifconfig.me || true)
  if [ -z "$ip" ]; then
    # Fallback to local interface IP
    ip=$(hostname -I | awk '{print $1}')
  fi
  echo "$ip"
}

# ──────────────────────────────────────────
# Find next free port
# ──────────────────────────────────────────
get_free_port() {
  local port=$1
  local proto=$2
  local ip=$3
  while true; do
    # Check UFW rules and ss bindings
    if ! ss -tuln | grep -q -E ":${port}\s" && ! ss -tuln | grep -q -E "\*:${port}\s"; then
      # Check if bound in Docker
      if ! docker ps --format '{{.Ports}}' | grep -q -E ":${port}->"; then
        echo "$port"
        return 0
      fi
    fi
    port=$((port + 1))
  done
}

# ──────────────────────────────────────────
# Add Node Command
# ──────────────────────────────────────────
add_node() {
  local moniker="${1:-}"
  local ip="${2:-}"
  local type="${3:-}"
  local mode="${4:-}" # "auto" or "recover"
  local mnemonic="${5:-}"

  # 1. Interactive Fallbacks
  if [ -z "$type" ]; then
    echo "Select Node Type:"
    echo "  1) WireGuard"
    echo "  2) V2Ray"
    echo "  3) OpenVPN"
    read -rp "Enter choice [1-3]: " type_choice
    case "$type_choice" in
      1) type="wireguard" ;;
      2) type="v2ray" ;;
      3) type="openvpn" ;;
      *) error "Invalid choice."; exit 1 ;;
    esac
  fi

  # Normalize type
  type=$(echo "$type" | tr '[:upper:]' '[:lower:]')
  if [[ "$type" != "wireguard" && "$type" != "v2ray" && "$type" != "openvpn" ]]; then
    error "Invalid node type: $type. Must be wireguard, v2ray, or openvpn."
    exit 1
  fi

  if [ -z "$ip" ]; then
    ip=$(detect_public_ip)
    info "No IP specified. Detected public IP: $ip"
  fi

  if [ -z "$moniker" ]; then
    local hostname
    hostname=$(hostname)
    moniker="${hostname}-${type}"
    info "No moniker specified. Generated moniker: $moniker"
  fi

  # Validate moniker uniqueness
  local container_name="nodepin_sentinel_${moniker}"
  if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
    error "Container name '$container_name' already exists. Choose a different moniker."
    exit 1
  fi

  # 2. Assign ports based on type
  local start_port=23501
  local proto="udp"
  if [ "$type" = "v2ray" ]; then
    start_port=1447
    proto="tcp"
  elif [ "$type" = "openvpn" ]; then
    start_port=12996
    proto="tcp"
  fi

  local node_port
  node_port=$(get_free_port "$start_port" "$proto" "$ip")
  local api_port
  api_port=$(get_free_port 8585 "tcp" "127.0.0.1")

  info "Allocated ports for $moniker ($type):"
  info "  - Service Port: $node_port ($proto)"
  info "  - Local API Port: $api_port (tcp)"

  # 3. Create host directories
  local node_data_dir="${DATA_DIR}/sentinel_${moniker}"
  mkdir -p "$node_data_dir"

  # 4. Initialize Sentinel configuration
  info "Initializing Sentinel configuration..."
  docker run --rm \
    -v "$(pwd)/${node_data_dir}:/root/.sentinel-dvpnx" \
    "$CONTAINER_IMAGE" init \
    --node.moniker "$moniker" \
    --node.service-type "$type" \
    --node.remote-addrs "${ip}:${node_port}" \
    --keyring.backend "test"

  # Adjust API Port in generated config.toml
  local config_file="${node_data_dir}/config.toml"
  if [ -f "$config_file" ]; then
    # Replace default api_port = "0.0.0.0:8585" with local container mapping
    sed -i 's/api_port = .*/api_port = "0.0.0.0:8585"/g' "$config_file"
  fi

  # 5. Wallet Key Setup
  local wallet_address=""
  local wallet_mnemonic=""

  if [ "$mode" = "recover" ]; then
    if [ -z "$mnemonic" ]; then
      echo "----------------------------------------------------------"
      echo "Paste your 24-word recovery phrase (mnemonic) below:"
      echo "----------------------------------------------------------"
      read -r mnemonic
    fi

    info "Recovering existing wallet key..."
    local recover_out
    recover_out=$(echo "$mnemonic" | docker run --rm -i \
      -v "$(pwd)/${node_data_dir}:/root/.sentinel-dvpnx" \
      "$CONTAINER_IMAGE" keys add main --recover --keyring.backend "test" 2>&1)
    
    wallet_address=$(echo "$recover_out" | grep -o 'sent1[a-z0-9]\{38\}' | head -n 1 || true)
    wallet_mnemonic="$mnemonic"
  else
    info "Generating new wallet key..."
    local key_out
    key_out=$(docker run --rm \
      -v "$(pwd)/${node_data_dir}:/root/.sentinel-dvpnx" \
      "$CONTAINER_IMAGE" keys add main --keyring.backend "test" 2>&1)

    wallet_address=$(echo "$key_out" | grep -o 'sent1[a-z0-9]\{38\}' | head -n 1 || true)
    # Extract mnemonic (usually the last lines containing 24 words)
    wallet_mnemonic=$(echo "$key_out" | tail -n 4 | tr '\n' ' ' | sed 's/.*Important.*phrase//' | xargs)
  fi

  if [ -z "$wallet_address" ]; then
    error "Failed to retrieve wallet address. Key generation output: $wallet_address"
    exit 1
  fi

  # Save keys locally for future reference
  echo "$wallet_address" > "${node_data_dir}/address.txt"
  jq -n \
    --arg addr "$wallet_address" \
    --arg mnem "$wallet_mnemonic" \
    '{address: $addr, mnemonic: $mnem}' > "${node_data_dir}/key_info.json"

  # 6. Configure Firewall (UFW)
  if command -v ufw &>/dev/null; then
    info "Adding UFW firewall rule for port ${node_port}/${proto}..."
    ufw allow "${node_port}/${proto}" comment "nodepin_${moniker}" || true
  else
    warn "UFW is not installed. Skipping firewall configuration."
  fi

  # 7. Start the Sentinel Node Container
  info "Starting Sentinel container: ${container_name}..."
  
  local docker_run_cmd=(
    docker run -d
    --name "$container_name"
    --restart unless-stopped
    --cap-add NET_ADMIN
    --device /dev/net/tun:/dev/net/tun
    -v "$(pwd)/${node_data_dir}:/root/.sentinel-dvpnx"
    -p "127.0.0.1:${api_port}:8585"
    -p "${ip}:${node_port}:${node_port}/${proto}"
    --network nodepin-net
    --label "com.nodepin.project=nodepin"
    --label "com.nodepin.network=sentinel"
    --label "com.nodepin.moniker=${moniker}"
    --label "com.nodepin.type=${type}"
    --label "com.nodepin.api_port=${api_port}"
    --label "com.nodepin.node_port=${node_port}"
    --label "com.nodepin.proto=${proto}"
    --label "com.nodepin.ip=${ip}"
    --label "com.centurylinklabs.watchtower.enable=true"
    "$CONTAINER_IMAGE"
    start
  )

  # Run the docker command
  "${docker_run_cmd[@]}"

  success "Node $moniker ($type) created and started successfully!"
  echo "=========================================================="
  echo "🔑 Wallet Address: $wallet_address"
  if [ "$mode" != "recover" ]; then
    echo "📝 Mnemonic Phrase: $wallet_mnemonic"
    echo "⚠️  SAVE THIS MNEMONIC SECURELY. IT WILL NOT BE SHOWN AGAIN."
  fi
  echo "=========================================================="
}

# ──────────────────────────────────────────
# Remove Node Command
# ──────────────────────────────────────────
remove_node() {
  local moniker="${1:-}"
  if [ -z "$moniker" ]; then
    read -rp "Enter moniker of the node to remove: " moniker
  fi

  local container_name="nodepin_sentinel_${moniker}"
  local node_data_dir="${DATA_DIR}/sentinel_${moniker}"

  if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
    error "Node container '$container_name' not found."
    exit 1
  fi

  info "Stopping and removing container: ${container_name}..."
  # Get container configuration details from labels before removal
  local node_port
  node_port=$(docker inspect --format '{{ index .Config.Labels "com.nodepin.node_port" }}' "$container_name" || true)
  local proto
  proto=$(docker inspect --format '{{ index .Config.Labels "com.nodepin.proto" }}' "$container_name" || true)

  docker stop "$container_name" || true
  docker rm "$container_name" || true

  # Remove UFW Firewall Rule
  if [ -n "$node_port" ] && [ -n "$proto" ] && command -v ufw &>/dev/null; then
    info "Removing UFW rule for port ${node_port}/${proto}..."
    ufw delete allow "${node_port}/${proto}" || true
  fi

  # Clean configuration files
  if [ -d "$node_data_dir" ]; then
    info "Archiving configuration files to ${node_data_dir}_backup..."
    mv "$node_data_dir" "${node_data_dir}_backup"
  fi

  success "Node $moniker has been successfully removed."
}

# ──────────────────────────────────────────
# List Nodes Command
# ──────────────────────────────────────────
list_nodes() {
  info "Active Sentinel Nodes:"
  echo "---------------------------------------------------------------------------------------"
  printf "%-25s %-12s %-15s %-12s %-10s\n" "Moniker" "Type" "IP Address" "Port" "Status"
  echo "---------------------------------------------------------------------------------------"
  
  local containers
  containers=$(docker ps -a --filter "label=com.nodepin.network=sentinel" --format "{{.Names}}")
  if [ -z "$containers" ]; then
    echo "No Sentinel nodes found."
    return
  fi

  for name in $containers; do
    local moniker type ip port status
    moniker=$(docker inspect --format '{{ index .Config.Labels "com.nodepin.moniker" }}' "$name")
    type=$(docker inspect --format '{{ index .Config.Labels "com.nodepin.type" }}' "$name")
    ip=$(docker inspect --format '{{ index .Config.Labels "com.nodepin.ip" }}' "$name")
    port=$(docker inspect --format '{{ index .Config.Labels "com.nodepin.node_port" }}' "$name")
    status=$(docker inspect --format '{{.State.Status}}' "$name")
    
    printf "%-25s %-12s %-15s %-12s %-10s\n" "$moniker" "$type" "$ip" "$port" "$status"
  done
  echo "---------------------------------------------------------------------------------------"
}

# ──────────────────────────────────────────
# Main Menu
# ──────────────────────────────────────────
show_usage() {
  echo "Usage: $0 {add|remove|list} [args...]"
  echo "  add <moniker> <ip> <type> [auto|recover] [mnemonic]"
  echo "  remove <moniker>"
  echo "  list"
}

# Check dependencies first
check_dependencies

if [ $# -eq 0 ]; then
  echo "=========================================================="
  echo "        NodePIN - Sentinel Multi-Node Manager"
  echo "=========================================================="
  echo "1) List active nodes"
  echo "2) Add a new Sentinel node (Auto Wallet)"
  echo "3) Add a new Sentinel node (Recover Wallet)"
  echo "4) Remove a Sentinel node"
  echo "5) Exit"
  read -rp "Select option [1-5]: " menu_choice
  case "$menu_choice" in
    1) list_nodes ;;
    2) add_node "" "" "" "auto" "" ;;
    3) add_node "" "" "" "recover" "" ;;
    4) remove_node ;;
    *) exit 0 ;;
  esac
else
  cmd=$1
  shift
  case "$cmd" in
    add) add_node "$@" ;;
    remove) remove_node "$@" ;;
    list) list_nodes ;;
    *) show_usage; exit 1 ;;
  esac
fi
