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

## ➕ How to add a new network

Just 3 steps:

1. **Add a `service`** in `docker-compose.yml` above the `# ═══...` marker.
2. **Create a folder** under `services/{network-name}/` with a `README.md`.
3. **Add its variables** to `.env.example` and `.env`.

Example:
```yaml
  packetstream:
    image: packetstream/psclient:latest
    container_name: packetstream
    restart: unless-stopped
    environment:
      - CID=${PACKETSTREAM_CID}
    networks:
      - nodepin-net
```

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

---

## 📌 Roadmap

- [ ] CI/CD auto-deploy (GitHub Actions / GitLab CI).
- [ ] Wire the dashboard to each network's native API (MYST earnings, STORJ stats...).
- [ ] Add authentication to the control panel.
- [ ] Custom domain + HTTPS.

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
