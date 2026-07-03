# Adding a network to NodePIN

> دليل إضافة شبكة ربح جديدة — 6 خطوات متكررة. Follow these 6 steps to add any new earning network.

NodePIN is built to be **pluggable**: every network is a self-contained unit. Adding
one never requires touching the core. Use `mysterium` (has a local API) or
`packetstream` (no local API) as reference examples.

---

## Checklist

- [ ] 1. Compose service
- [ ] 2. Provider module
- [ ] 3. Docs folder
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
//   status:   'ok' | 'starting' | 'error' | custom
//   earnings: number | null   (null if the network has no local API)
//   extra:    any extra fields (usage, links, ...)
module.exports = { network: 'mynetwork', getMetrics };
```

- If the network exposes a **local API**, query it with the `getJson` helper from
  `providers/http.js` and return `status: 'starting'` on timeout (see `mysterium.js`).
- If it has **no local API**, return `status: 'ok'`, `earnings: null`, and a
  dashboard link in `extra` (see `packetstream.js`). Do **not** fabricate numbers.

The loader picks the module up automatically — no registration needed.

## 3) Docs folder

Add `services/mynetwork/README.md`: purpose, enable/disable, required `.env`
variables, earnings source, and any notes (ports, persistence).

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

Add `services/control-panel/test/mynetwork.test.js`. Mock `global.fetch` if the
provider calls an API; otherwise just assert the returned shape. Run `npm test`.

---

## Enable it

Add the network key to `ENABLED_NETWORKS` in `.env`, then `make up`.
Run one network or many:

```
ENABLED_NETWORKS=mysterium,storj,mynetwork
```

That's it — the dashboard, isolation, Watchtower, and metrics all pick it up.
