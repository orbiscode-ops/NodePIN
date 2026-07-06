#!/bin/bash
# Sentinel Node Initializer helper script for NodePIN.

set -e

# Load moniker and port from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
elif [ -f ../../.env ]; then
  export $(grep -v '^#' ../../.env | xargs)
fi

MONIKER="nodepin_dvpn"
PORT=${SENTINEL_PORT:-60299}

echo "=========================================================="
echo "          Sentinel dVPN Node Initializer"
echo "=========================================================="
echo "Moniker: $MONIKER"
echo "WireGuard Port: $PORT"
echo "=========================================================="

# Create local data folder if it doesn't exist
mkdir -p ./data/sentinel

# 1. Initialize configuration and certificates
echo "Initializing Sentinel node configuration and TLS certificates..."
docker run --rm -v "$(pwd)/data/sentinel:/root/.sentinelnode" \
  ghcr.io/sentinel-official/sentinel-dvpnx:latest init \
  --node.moniker "$MONIKER" \
  --node.service-type "wireguard" \
  --node.remote-addrs "${NODEPIN_VPS_IP:-127.0.0.1}:37703" \
  --keyring.backend "test"

# 2. Generate wallet keys
echo ""
echo "----------------------------------------------------------"
echo "Generating Wallet Keys (Interactive)"
echo "----------------------------------------------------------"
echo "IMPORTANT: Write down your mnemonic phrase and public key!"
echo "----------------------------------------------------------"
docker run --rm -it -v "$(pwd)/data/sentinel:/root/.sentinelnode" \
  ghcr.io/sentinel-official/sentinel-dvpnx:latest keys add main \
  --keyring.backend "test"

echo "=========================================================="
echo "Initialization Complete!"
echo "1. Fund your node wallet address displayed above with at least 150-200 DVPN."
echo "2. Run 'make up' or deploy via GitHub Actions to start the service."
echo "=========================================================="
