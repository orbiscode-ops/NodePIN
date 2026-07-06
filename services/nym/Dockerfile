FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates curl wget openssl && rm -rf /var/lib/apt/lists/*

# Download latest stable nym-node binary for Linux x86_64
ARG NYM_VERSION="nym-binaries-v2026.12-yaroslavsky"
RUN wget -O /usr/local/bin/nym-node "https://github.com/nymtech/nym/releases/download/${NYM_VERSION}/nym-node" && \
    chmod +x /usr/local/bin/nym-node

WORKDIR /root/.nym
ENTRYPOINT ["/usr/local/bin/nym-node"]
