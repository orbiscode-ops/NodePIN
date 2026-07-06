# Adding a network to NodePIN

> دليل إضافة شبكة ربح جديدة — 6 خطوات متكررة. Follow these 6 steps to add any new earning network.

NodePIN is built to be **pluggable**: every network is a self-contained unit. Adding
one never requires touching the core. Use `mysterium` (has a local API) or
`honeygain` (web API) or `proxyrack` (no API) as reference examples.

---

## Checklist

- [ ] 1. Compose service
- [ ] 2. Provider module
- [ ] 3. Docs folder (`networks/`)
- [ ] 4. Env variables
- [ ] 5. Setup script wiring
- [ ] 6. Unit test

---

## 1) Compose service

Add a service in `docker-compose.yml` **above** the `— أضف شبكة جديدة —` marker.
Rules: `nodepin_` container name, a `profile` matching the network key, the
`nodepin-net` network, and the isolation labels.

```yaml
  mynetwork:
    image: vendor/mynetwork:latest
    container_name: nodepin_mynetwork
    profiles: ["mynetwork"]
    restart: unless-stopped
    environment:
      - TOKEN=${MYNETWORK_TOKEN}
    networks:
      - nodepin-net
    labels:
      com.nodepin.project: "nodepin"
      com.nodepin.network: "mynetwork"
      com.centurylinklabs.watchtower.enable: "true"
```

If the network needs a published port, make it configurable in `.env`
(e.g. `${MYNETWORK_PORT:-1234}:1234`) so it never clashes with other apps.

## 2) Provider module

Create `services/control-panel/providers/mynetwork.js`. It must export
`{ network, getMetrics }`. `getMetrics()` returns:

```js
// { network, token, status, earnings, extra }
//   status:   'ok' | 'starting' | 'error' | 'not_configured'
//   earnings: number | null   (null if the network has no local API)
//   extra:    any extra fields (usage, links, ...)
module.exports = { network: 'mynetwork', getMetrics };
```

- If the network exposes a **local API**, query it with the `getJson` helper from
  `providers/http.js` and return `status: 'starting'` on timeout (see `mysterium.js`).
- If it has a **web API** (login required), cache the JWT and query it (see `honeygain.js`).
- If it has **no local API**, return `status: 'ok'`, `earnings: null`, and a
  dashboard link in `extra` (see `proxyrack.js`). Do **not** fabricate numbers.

The loader picks the module up automatically — no registration needed.

## 3) Docs folder

Add `networks/mynetwork/README.md`: purpose, enable/disable, required `.env`
variables, earnings source, and any notes (ports, persistence).

> **Note:** Only infrastructure services (`control-panel`, `caddy`) live under
> `services/`. All earning networks belong in `networks/`.

## 4) Env variables

Add the network's variables to `.env.example` with a short comment. Never commit
real secrets.

## 5) Setup script wiring

In `setup.sh`:
- add a numbered option in `select_networks` mapping to the network key;
- add a `collect_vars` block that prompts only for this network's variables
  (use the `silent` arg for secrets);
- add its required-var checks in `validate`.

## 6) Unit test

Add a test case in `services/control-panel/test/providers.new.test.js`.
Mock `global.fetch` if the provider calls an API; otherwise just assert the
returned shape. Run:

```bash
node --test "test/*.test.js"
```

---

## Enable it

Add the network variables to `.env`, then run it using its profile:

```bash
docker compose --profile mynetwork up -d
```

That's it — the dashboard, isolation, Watchtower, and metrics all pick it up.
