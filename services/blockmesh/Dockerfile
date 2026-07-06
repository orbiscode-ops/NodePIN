FROM debian:stable-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download the designated stable BlockMesh CLI release (v0.0.359)
RUN echo "Downloading BlockMesh CLI v0.0.359..." \
    && curl -L -o blockmesh.tar.gz "https://github.com/block-mesh/block-mesh-monorepo/releases/download/v0.0.359/blockmesh-cli-x86_64-unknown-linux-gnu.tar.gz" \
    && tar -xzf blockmesh.tar.gz \
    && find . -name "blockmesh-cli" -exec mv {} /usr/local/bin/blockmesh-cli \; \
    && chmod +x /usr/local/bin/blockmesh-cli \
    && rm -rf /app/*

ENTRYPOINT ["/bin/sh", "-c", "exec blockmesh-cli login --email \"$BLOCKMESH_EMAIL\" --password \"$BLOCKMESH_PASSWORD\""]
