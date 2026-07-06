FROM debian:stable-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN LATEST_TAG=$(curl -s https://api.github.com/repos/block-mesh/block-mesh-monorepo/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/') \
    && echo "Latest BlockMesh version: ${LATEST_TAG}" \
    && curl -L -o blockmesh.tar.gz "https://github.com/block-mesh/block-mesh-monorepo/releases/download/${LATEST_TAG}/blockmesh-cli-x86_64-unknown-linux-gnu.tar.gz" \
    && tar -xzf blockmesh.tar.gz \
    && find . -name "blockmesh-cli" -exec mv {} /usr/local/bin/blockmesh-cli \; \
    && chmod +x /usr/local/bin/blockmesh-cli \
    && rm -rf /app/*

ENTRYPOINT ["/bin/sh", "-c", "exec blockmesh-cli login --email \"$BLOCKMESH_EMAIL\" --password \"$BLOCKMESH_PASSWORD\""]
