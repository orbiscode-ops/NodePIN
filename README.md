# NodeYield 🌐

بنية تحتية Dockerized مرنة لتشغيل وإدارة **عُقد (Nodes) لامركزية** على VPS.

الهدف: توليد دخل سلبي (passive income) من شبكات العملات اللامركزية مثل **Mysterium** و **Storj** وغيرها.

---

## 📁 هيكل المشروع

```
NodeYield/
├── .env.example          ← كل المتغيرات (انسخه إلى .env)
├── .gitignore            ← يمنع رفع Secrets
├── docker-compose.yml    ← كل الخدمات (سهل إضافة/حذف شبكة)
├── services/
│   ├── control-panel/    ← لوحة تحكم (Node.js/Express)
│   ├── mysterium/        ← توثيق Mysterium
│   └── storj/            ← توثيق Storj
└── .github/
    └── workflows/        ← CI/CD (لاحقاً)
```

---

## 🚀 التشغيل السريع

```bash
# 1) نسخ المتغيرات
cp .env.example .env

# 2) عدّل .env ببياناتك
nano .env

# 3) تشغيل
sudo docker compose up -d

# 4) فتح لوحة التحكم
# http://YOUR_SERVER_IP:3000
```

---

## ➕ كيف تضيف شبكة جديدة؟

مجرد 3 خطوات:

1. **أضف `service` في `docker-compose.yml`** أعلى `# ═══════════════════════════════════════════`.
2. **أنشئ مجلد تحت `services/{network-name}/`** ثم ضع `README.md` فيه.
3. **أضف متغيراته في `.env.example` و `.env`**.

مثال:
```yaml
  packetstream:
    image: packetstream/psclient:latest
    container_name: packetstream
    restart: unless-stopped
    environment:
      - CID=${PACKETSTREAM_CID}
    networks:
      - nodeyield-net
```

---

## 🗑️ كيف تحذف شبكة؟

احذف سطور `service` الخاصة بها من `docker-compose.yml` ثم:
```bash
sudo docker compose up -d
```

---

## 🔐 أمان

- **لا ترفع `.env` أبداً لـ Git.** (.gitignore موجود مسبقاً)
- كل مفاتيح ومحافظ في `.env` فقط.
- الهيكل مفتوح المصدر وآمن للرفع العام.

---

## 📌 ملاحظات مفتوحة

- [ ] إعداد GitHub Actions للنشر التلقائي.
- [ ] ربط Dashboard بـ APIs الخاصة بكل شبكة (MYST earnings, STORJ stats...).
- [ ] إضافة مصادقة (Authentication) لوحة التحكم.
- [ ] اختيار Domain + HTTPS.

---

NodeYield — بنية Node لامركزية قابلة للتوسيع 💡
"# NodePIN" 
"# NodePIN" 
