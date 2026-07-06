FROM debian:stable-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN LATEST_TAG=$(curl -sI https://github.com/block-mesh/block-mesh-monorepo/releases/latest | grep -i "location:" | awk -F'/' '{print $NF}' | tr -d '\r\n') \
    && LATEST_TAG=${LATEST_TAG:-v0.0.625} \
    && [ -n "$LATEST_TAG" ] || LATEST_TAG="v0.0.625" \
    && echo "Latest BlockMesh version to download: ${LATEST_TAG}" \
    && curl -L -o blockmesh.tar.gz "https://github.com/block-mesh/block-mesh-monorepo/releases/download/${LATEST_TAG}/blockmesh-cli-x86_64-unknown-linux-gnu.tar.gz" \
    && tar -xzf blockmesh.tar.gz \
    && find . -name "blockmesh-cli" -exec mv {} /usr/local/bin/blockmesh-cli \; \
    && chmod +x /usr/local/bin/blockmesh-cli \
    && rm -rf /app/*

ENTRYPOINT ["/bin/sh", "-c", "exec blockmesh-cli login --email \"$BLOCKMESH_EMAIL\" --password \"$BLOCKMESH_PASSWORD\""]
