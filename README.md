# NodePIN 🌐

> **NodePIN** — a pluggable, Dockerized infrastructure to run and manage **decentralized nodes** on any VPS and earn **passive income** from DePIN networks.
>
> بنية تحتية مرنة (Dockerized) لتشغيل وإدارة **عُقد لامركزية** على أي VPS بهدف توليد **دخل سلبي** من شبكات DePIN.

---

## ✨ Why NodePIN?

- **Plug-and-play:** clone, set one `.env`, run one command, start earning.
- **Pluggable networks:** add or remove any earning network without breaking the rest.
- **Unified dashboard:** monitor all containers, node status, and live earnings in one place.
- **Custom networks UI:** add any new network directly from the dashboard — no coding needed.
- **Secure by default:** all secrets live in `.env` (never committed).

---

## 📁 Project structure

```
NodePIN/
├── .env.example              ← all variables (copy to .env)
├── .gitignore
├── docker-compose.yml        ← all services + networks (easy to add/remove)
├── Makefile                  ← make up/down/logs/ps/pull
├── setup.sh                  ← interactive one-command setup
│
├── networks/                 ← 📦 one folder per earning network (docs only)
│   ├── mysterium/      ├── storj/          ├── honeygain/
│   ├── bitping/        ├── meson/          ├── huddle01/
│   ├── traffmonetizer/ ├── iproyal/        ├── peer2profit/
│   ├── repocket/       ├── earnapp/        ├── packetstream/
│   ├── proxyrack/      ├── nodepay/        ├── grass/
│   ├── gradient/       ├── uprock/         └── titan/
│
├── services/                 ← ⚙️  infrastructure only
│   ├── control-panel/        ← dashboard (Node.js/Express)
│   └── caddy/                ← HTTPS reverse proxy
│
└── docs/
    └── adding-a-network.md   ← how to plug in a new network
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
nano .env   # set ENABLED_NETWORKS, credentials, ports...

# 2) run only the networks listed in ENABLED_NETWORKS
make up

# 3) open the dashboard
# http://YOUR_SERVER_IP:3000
```

---

## 🌐 Supported networks — 18 شبكة جاهزة

### 🟢 Crypto / Token networks — أرباح بالعملات الرقمية

| # | الشبكة | Key في `.env` | العملة | الأرباح في اللوحة | التسجيل |
|---|--------|--------------|--------|-------------------|---------|
| 1 | **Mysterium** | `mysterium` | MYST | ✅ حية | [mysterium.network](https://mysterium.network) |
| 2 | **Storj** | `storj` | STORJ | ✅ حية | [storj.io](https://storj.io) |
| 3 | **Bitping** | `bitping` | NOIA | ✅ حية | [app.bitping.com](https://app.bitping.com) |
| 4 | **Meson Network** | `meson` | MSN | ✅ حية | [dashboard.meson.network](https://dashboard.meson.network) |
| 5 | **Huddle01** | `huddle01` | HUDL | ✅ حية | [node.huddle01.com](https://node.huddle01.com) |
| 6 | **Grass** | `grass` | GRASS | 🔗 موقعهم | [app.getgrass.io](https://app.getgrass.io/register) |
| 7 | **Gradient** | `gradient` | GRAD | 🔗 موقعهم | [app.gradient.network](https://app.gradient.network) |
| 8 | **Nodepay** | `nodepay` | NC | 🔗 موقعهم | [app.nodepay.ai](https://app.nodepay.ai) |
| 9 | **Uprock** | `uprock` | UPT | 🔗 موقعهم | [uprock.com](https://uprock.com) |
| 10 | **Titan Network** | `titan` | TTN | 🔗 موقعهم | [storage.titannet.io](https://storage.titannet.io) |

### 💵 USD networks — أرباح بالدولار

| # | الشبكة | Key في `.env` | الدفع | الأرباح في اللوحة | التسجيل |
|---|--------|--------------|-------|-------------------|---------|
| 11 | **Honeygain** | `honeygain` | USD | ✅ حية | [r.honeygain.me](https://r.honeygain.me) |
| 12 | **Traffmonetizer** | `traffmonetizer` | USD/BTC | 🔗 موقعهم | [traffmonetizer.com](https://traffmonetizer.com) |
| 13 | **IPRoyal Pawns** | `iproyal` | USD | 🔗 موقعهم | [pawns.app](https://pawns.app) |
| 14 | **Peer2Profit** | `peer2profit` | USD | 🔗 موقعهم | [peer2profit.com](https://peer2profit.com) |
| 15 | **Repocket** | `repocket` | USD | 🔗 موقعهم | [repocket.co](https://link.repocket.co) |
| 16 | **EarnApp** | `earnapp` | USD | 🔗 موقعهم | [earnapp.com](https://earnapp.com) |
| 17 | **PacketStream** | `packetstream` | USD | 🔗 موقعهم | [packetstream.io](https://packetstream.io) |
| 18 | **Proxyrack** | `proxyrack` | USD | 🔗 موقعهم | [peer.proxyrack.com](https://peer.proxyrack.com) |

> **تشغيل الكل دفعة واحدة:** اكتب `all` عند سؤال `setup.sh`، أو اضبط:
> ```
> ENABLED_NETWORKS=mysterium,storj,honeygain,bitping,meson,huddle01,traffmonetizer,iproyal,peer2profit,repocket,earnapp,packetstream,proxyrack,nodepay,grass,gradient,uprock,titan
> ```

---

## ➕ إضافة شبكة جديدة — طريقتان

### 1) من لوحة التحكم (الأسهل) 🆕
افتح **`/networks.html`** من الداشبورد ← اضغط **＋ إضافة شبكة** ← أدخل التفاصيل ← حفظ.
لا تحتاج لمس أي كود.

### 2) يدوياً (للمطورين)
راجع الدليل الكامل: 👉 **[docs/adding-a-network.md](docs/adding-a-network.md)**

---

## 🗑️ How to remove a network

Delete its `service` block from `docker-compose.yml`, remove its entry from
`ENABLED_NETWORKS` in `.env`, then:
```bash
make up
```

---

## 🔐 Security

- **Never commit `.env`.** (`.gitignore` already covers it.)
- All keys, wallets, and passwords stay in `.env` only.
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

---

## 📌 Roadmap

- [x] CI/CD auto-deploy (GitHub Actions).
- [x] Wire the dashboard to each network's native API (live earnings).
- [x] Add authentication to the control panel.
- [x] Custom domain + HTTPS (Caddy).
- [x] 18 earning networks across USD + crypto tokens.
- [x] Add / manage custom networks from the dashboard UI (no coding).
- [ ] Historical earnings charts (SQLite persistence).
- [ ] Telegram / Discord earnings notifications.

---

## 🤝 Need help? / تحتاج مساعدة؟

Not a developer? No problem. We can set everything up **for you** — install NodePIN,
connect your wallets, and get you earning. Just reach out:

لست مبرمجًا؟ لا مشكلة. يمكننا إعداد كل شيء **نيابة عنك** — تثبيت NodePIN،
ربط محافظك، وتجهيزك للربح. فقط تواصل معنا:

- 📧 **Email:** `<add-your-email-here>`
- 💬 **Telegram:** `<add-your-telegram-here>`

---

NodePIN — a scalable, pluggable decentralized-node infrastructure 💡
