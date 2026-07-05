#!/bin/sh
set -e

# Path to volume data
DATA_DIR="/nkn/data"
WALLET_FILE="${DATA_DIR}/wallet.json"
PASSWORD_FILE="${DATA_DIR}/wallet.pswd"
CONFIG_FILE="${DATA_DIR}/config.json"

mkdir -p "$DATA_DIR"

# 1. Write the password file if password is provided
if [ -n "$NKN_WALLET_PASSWORD" ]; then
    echo -n "$NKN_WALLET_PASSWORD" > "$PASSWORD_FILE"
    chmod 600 "$PASSWORD_FILE"
else
    echo "⚠️ Warning: NKN_WALLET_PASSWORD is empty!"
fi

# 2. Generate wallet if it doesn't exist
if [ ! -f "$WALLET_FILE" ]; then
    echo "🔑 Generating a new NKN wallet..."
    if [ -z "$NKN_WALLET_PASSWORD" ]; then
        echo "❌ Error: Cannot create wallet without NKN_WALLET_PASSWORD!"
        exit 1
    fi
    (echo "$NKN_WALLET_PASSWORD"; echo "$NKN_WALLET_PASSWORD") | /nkn/nknc wallet -c
    # nknc saves it by default in current directory as wallet.json, let's move it to data
    if [ -f "wallet.json" ]; then
        mv wallet.json "$WALLET_FILE"
    fi
    chmod 600 "$WALLET_FILE"
    echo "✅ Wallet generated successfully."
else
    echo "✅ Existing wallet found."
fi

# 3. Print wallet address to logs so they can see/backup it
if [ -f "$WALLET_FILE" ]; then
    echo "--------------------------------------------------"
    echo "Wallet Address:"
    /nkn/nknc wallet -l | grep -i "address:" || true
    echo "--------------------------------------------------"
fi

# 4. Download and setup config.json with BeneficiaryAddress
if [ ! -f "$CONFIG_FILE" ]; then
    echo "📥 Downloading official mainnet config.json..."
    wget -q -O "$CONFIG_FILE" https://raw.githubusercontent.com/nknorg/nkn/master/config.mainnet.json || curl -s -o "$CONFIG_FILE" https://raw.githubusercontent.com/nknorg/nkn/master/config.mainnet.json
fi

# Modify beneficiary address in config.json if NKN_BENEFICIARY_ADDR is set
if [ -n "$NKN_BENEFICIARY_ADDR" ] && [ -f "$CONFIG_FILE" ]; then
    echo "✏️ Setting BeneficiaryAddr to: $NKN_BENEFICIARY_ADDR"
    # Use sed to replace BeneficiaryAddr in config.json
    # The default config has: "BeneficiaryAddr": "",
    sed -i "s/\"BeneficiaryAddr\":\s*\"[^\"]*\"/\"BeneficiaryAddr\": \"$NKN_BENEFICIARY_ADDR\"/g" "$CONFIG_FILE"
fi

echo "🚀 Starting NKN Node..."
exec /nkn/nknd --config "$CONFIG_FILE" --wallet "$WALLET_FILE" --password-file "$PASSWORD_FILE" "$@"
