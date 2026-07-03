# NodePIN 🌐

> **NodePIN** — a pluggable, Dockerized infrastructure to run and manage **decentralized nodes** on any VPS and earn **passive income** from DePIN networks (Mysterium, Storj, and more).
>
> بنية تحتية مرنة (Dockerized) لتشغيل وإدارة **عُقد لامركزية** على أي VPS بهدف توليد **دخل سلبي** من شبكات DePIN مثل Mysterium و Storj وغيرها.

---

## ✨ Why NodePIN?

- **Plug-and-play:** clone, set one `.env`, run one command, start earning.
- **Pluggable networks:** add or remove any earning network in 3 steps without breaking the rest.
- **Unified dashboard:** monitor all containers, node status, and earnings in one place.
- **Secure by default:** all secrets live in `.env` (never committed).

---

## 📁 Project structure

```
NodePIN/
├── .env.example          ← all variables (copy to .env)
├── .gitignore            ← keeps secrets out of Git
├── docker-compose.yml    ← all services (easy to add/remove a network)
├── services/
│   ├── control-panel/    ← dashboard (Node.js/Express)
│   ├── mysterium/        ← Mysterium docs
│   └── storj/            ← Storj docs
└── .github/
    └── workflows/        ← CI/CD (later)
```

---

## 🚀 Quick start

### Recommended: one command

```bash
./setup.sh
```

The interactive script checks Docker, creates `.env`, lets you pick which networks
to run, asks only for the values those networks need, validates them, and launches
the stack — then prints your dashboard URL.

### Manual (advanced)

```bash
# 1) copy variables and edit them
cp .env.example .env
nano .env   # set ENABLED_NETWORKS, wallets, passphrases, ports...

# 2) run only the networks listed in ENABLED_NETWORKS
make up

# 3) open the dashboard
# http://YOUR_SERVER_IP:3000
```

> **Run one network or many:** set `ENABLED_NETWORKS=mysterium` for a single
> network, or `ENABLED_NETWORKS=mysterium,storj` for several. Only the listed
> networks start; everything is isolated under the `nodepin` project so it won't
> clash with other apps on the same server. Ports are configurable in `.env`.

---

## 🌐 Supported networks

| Key | Type | Earns | Local earnings API |
|---|---|---|---|
| `mysterium` | bandwidth | MYST | ✅ (dashboard shows earnings) |
| `storj` | storage | STORJ | ✅ (dashboard shows earnings) |
| `packetstream` | bandwidth | USD | ❌ (see provider dashboard) |
| `grass` | bandwidth | GRASS | ❌ (see provider dashboard) |

Enable any combination via `ENABLED_NETWORKS`.

---

## ➕ How to add a new network

Adding a network is a repeatable 6-step pattern (compose service → provider module
→ docs → env vars → setup wiring → test). See the full guide:

👉 **[docs/adding-a-network.md](docs/adding-a-network.md)**

---

## 🗑️ How to remove a network

Delete its `service` block from `docker-compose.yml`, then:
```bash
sudo docker compose up -d
```

---

## 🔐 Security

- **Never commit `.env`.** (`.gitignore` already covers it.)
- All keys and wallets stay in `.env` only.
- The repository structure is open-source and safe to publish publicly.

### Dashboard authentication

Set `DASHBOARD_PASSWORD` in `.env` to require login (session cookie, signed with
`SESSION_SECRET`). Leave it empty to disable auth (not recommended in production).
A `DASHBOARD_API_KEY` is also supported for programmatic access via the
`x-api-key` header.

### HTTPS (recommended for public servers)

Run the built-in **Caddy** reverse proxy for automatic TLS:

1. Point `NODEPIN_DOMAIN` (DNS A record) to your server.
2. Add `https` to `ENABLED_NETWORKS`, e.g. `ENABLED_NETWORKS=mysterium,storj,https`.
3. Set `COOKIE_SECURE=true`.
4. `make up` — Caddy obtains a certificate and serves the dashboard over HTTPS.

Behind HTTPS, you can stop publishing the dashboard port directly and reach it
only through `https://your-domain`.

---

## 📌 Roadmap

- [x] CI/CD auto-deploy (GitHub Actions — selective per network).
- [x] Wire the dashboard to each network's native API (MYST earnings, STORJ stats...).
- [x] Add authentication to the control panel.
- [x] Custom domain + HTTPS (Caddy).
- [ ] More lightweight bandwidth-sharing networks (Phase 2).
- [ ] Historical earnings charts (SQLite persistence).

---

## 🤝 Need help? / تحتاج مساعدة؟

Not a developer? No problem. We can set everything up **for you** — install NodePIN,
connect your wallets, and get you earning. Just reach out:

لست مبرمجًا؟ لا مشكلة. يمكننا إعداد كل شيء **نيابة عنك** — تثبيت NodePIN،
ربط محافظك، وتجهيزك للربح. فقط تواصل معنا:

- 📧 **Email:** `<add-your-email-here>`
- 💬 **Telegram:** `<add-your-telegram-here>`
- 💡 **Other:** `<add-any-other-channel-here>`

---

NodePIN — a scalable, pluggable decentralized-node infrastructure 💡
