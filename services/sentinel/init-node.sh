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

# 1. Initialize configuration files
echo "Initializing Sentinel node configuration..."
docker run --rm --entrypoint sentinel-dvpnx \
  -v "$(pwd)/data/sentinel:/root/.sentinelnode" \
  ghcr.io/sentinel-official/sentinel-dvpnx:latest process config init

docker run --rm --entrypoint sentinel-dvpnx \
  -v "$(pwd)/data/sentinel:/root/.sentinelnode" \
  ghcr.io/sentinel-official/sentinel-dvpnx:latest process wireguard config init

# 2. Update config parameters
echo "Updating configuration with moniker..."
# Modify moniker in config.toml
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/moniker = .*/moniker = \"$MONIKER\"/" ./data/sentinel/config.toml
else
  sed -i "s/moniker = .*/moniker = \"$MONIKER\"/" ./data/sentinel/config.toml
fi

# 3. Generate self-signed TLS certificates
echo "Generating self-signed SSL/TLS certificates..."
if [ ! -f ./data/sentinel/tls.crt ] || [ ! -f ./data/sentinel/tls.key ]; then
  # Use a docker openssl image to generate certs safely (in case host doesn't have openssl)
  docker run --rm \
    -v "$(pwd)/data/sentinel:/data" \
    alpine/openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -x509 -sha256 -days 365 -nodes \
    -keyout /data/tls.key \
    -out /data/tls.crt \
    -subj "/C=US/ST=State/L=City/O=Sentinel/OU=dVPN/CN=."
  echo "TLS Certs generated successfully."
else
  echo "TLS Certs already exist."
fi

# 4. Generate wallet keys
echo ""
echo "----------------------------------------------------------"
echo "Generating Wallet Keys (Interactive)"
echo "----------------------------------------------------------"
echo "IMPORTANT: Write down your mnemonic phrase and public key!"
echo "----------------------------------------------------------"
docker run --rm -it --entrypoint sentinel-dvpnx \
  -v "$(pwd)/data/sentinel:/root/.sentinelnode" \
  ghcr.io/sentinel-official/sentinel-dvpnx:latest process keys add

echo "=========================================================="
echo "Initialization Complete!"
echo "1. Fund your node wallet address displayed above with at least 50-100 DVPN."
echo "2. Run 'make up' or deploy via GitHub Actions to start the service."
echo "=========================================================="
