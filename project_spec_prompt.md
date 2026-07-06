# مواصفات المشروع الكاملة (Project Specification Prompt)

## 🎯 نظرة عامة على الهدف

بناء بنية تحتية **Dockerized** على VPS (netcup) لتشغيل وإدارة **عُقد (Nodes) لشبكات العملات اللامركزية** بهدف توليد دخل سلبي (passive income)، تشمل:

- **Mysterium Network (MystNodes)** — استهلاك/توفير بروكسي لامركزي (Consumer/Provider حسب الاستراتيجية)، identity مسجلة، رصيد MYST.
- **Storj Node** — مشاركة مساحة تخزين لامركزية وتحقيق دخل من STORJ.
- **شبكات احتياطية** (Provider abstraction): قابلة للإضافة لاحقاً إذا أثبتت جدوى اقتصادية.

تعتمد المعمارية بالكامل على **Docker** (خدمات متعددة تعمل بالتوازي) مع:
- نشر تلقائي (CI/CD) عبر **GitHub Actions** يرفع كل تحديث للسيرفر المستهدف.
- **لوحة تحكم (Dashboard)** موحدة لمراقبة الحاويات، حالة النودات، الاستهلاك، التكاليف، والدخل.

---

## 🏗️ المعمارية العامة (Architecture)

```
[VPS المستهدف - netcup]
        |
   ┌─────────────────────────────┐
   │  Docker Host                │
   │  ├── myst_client            │ → نود Mysterium (Consumer أو Provider)
   │  ├── storj-node             │ → نود Storj (مشاركة تخزين)
   │  ├── control-panel          │ → لوحة تحكم موحدة
   │  └── watchtower/monitoring  │ → مراقبة وإعادة تشغيل تلقائي
   └─────────────────────────────┘
```

---

## 🔧 المتطلبات التقنية التفصيلية

### 1. طبقة الشبكات اللامركزية (Decentralized Network Nodes Layer)

#### Mysterium Network (`myst_client`)
- نود Mysterium يعمل بـ identity مسجلة، رصيد MYST متوفر.
- استراتيجية التدوير (إذا كانت في وضع Consumer): تدوير ذكي — يتغير النود عند:
  - حدوث خطأ/حظر فعلي (403/429).
  - أو بعد مرور مدة قصوى احتياطية (قابلة للتهيئة، افتراضياً 30 دقيقة).
  - **لا** يتغير مع كل طلب (لتقليل التكلفة).
- فلترة النودات: أمريكي (US) residential كافتراضي، قابل للتوسعة لدول أخرى.
- التحكم عبر: **TequilAPI** المحلي (`127.0.0.1:4050`)، بدون تدخل يدوي بالـ CLI.
- بدائل احتياطية يجب دعمها بمرونة بالكود (Provider abstraction).

#### Storj Node (`storj-node`)
- نود Storj مستقر لمشاركة مساحة التخزين.
- يُدار عبر configuration standard (config.yaml).
- يجب ضمان استقرار الاتصال والـ uptime لتحقيق أقصى عائد.
- تسجيل الأرباح والـ storage/bandwidth usage.

### 2. طبقة المراقبة والتحكم (Control Panel / Dashboard)

تطبيق ويب موحد يجمع مراقبة كل شيء بمكان واحد، يعرض:
- حالة كل حاوية Docker (Running/Stopped/Restarting) وزمن التشغيل (Uptime).
- حالة اتصال كل نود (IP، الدولة، مدة الجلسة، الرصيد المتبقي MYST).
- إحصائيات الاستهلاك والتكلفة التقريبية (يومي/أسبوعي/شهري).
- **الدخل/العائد** من كل شبكة (MYST من Mysterium، STORJ من Storj، وغيرها).
- تنبيهات عند مشاكل (رصيد منخفض، حاوية متوقفة، connectivity issues).

**تقنيات مقترحة للوحة التحكم** (قابلة للتعديل):
- الخلفية: Node.js/Express أو Python/FastAPI — تتواصل مع Docker Engine API + TequilAPI.
- الواجهة: React أو أي إطار عمل خفيف، تحديث لحظي عبر WebSocket أو polling دوري.
- تخزين البيانات التاريخية: قاعدة بيانات خفيفة (SQLite أو PostgreSQL) لتسجيل الإحصائيات والأرباح.

### 3. البنية التحتية والنشر (Infrastructure & CI/CD)

- **GitHub Actions** workflow يقوم بـ:
  1. بناء صور Docker (build) عند كل push/merge لفرع رئيسي (`main`).
  2. رفع الصور لسجل (Docker Registry — GitHub Container Registry أو Docker Hub).
  3. الاتصال بالـ VPS عبر SSH (باستخدام secrets مخزنة بأمان بـ GitHub Secrets).
  4. تنفيذ `docker compose pull && docker compose up -d` على السيرفر المستهدف لتحديث الحاويات تلقائياً بدون تدخل يدوي.
- استخدام `docker-compose.yml` موحد يعرّف كل الخدمات (myst_client, storj-node, control-panel، أي خدمة لاحقة).
- إعادة تشغيل تلقائي للحاويات عند إعادة تشغيل السيرفر (`restart: unless-stopped`).

### 4. الأمان والعزل (Security & Isolation)

- كل نود معزول في حاوية Docker خاصة.
- استخدام شبكات Docker منفصلة (`docker network`) بين الخدمات حسب الحاجة.
- إبرام **اتفاقية معالجة بيانات (DPA)** مع مزود الاستضافة (netcup) إذا لزم.
- مفاتيح ومحافظ (identities) الخاصة بالشبكات اللامركزية محفوظة بشكل آمن (لا تُرفع لـ Git أبداً — استخدام `.env` + `.gitignore`).
- تشفير الاتصالات الحساسة (HTTPS/TLS لـ Dashboard)، وإعداد جدار حماية (Firewall) على VPS.

---

## 📦 الخدمات المتوقعة داخل docker-compose.yml

| الخدمة | الوظيفة | ملاحظات |
|---|---|---|
| `myst_client` | نود Mysterium | Consumer/Provider mode — identity + رصيد MYST |
| `storj-node` | نود Storj | مشاركة تخزين لامركزي |
| `control-panel` | لوحة تحكم موحدة | مراقبة الحاويات والدخل والتكلفة |
| `watchtower` | تحديث تلقائي لصور Docker | يبقي النظام محدّث بدون تدخل يدوي (اختياري) |
| **خدمات لاحقة** | شبكات أخرى... | قابلة للإضافة بسهولة عبر `docker-compose.yml` |

---

## ✅ معايير القبول (Definition of Done)

- [ ] كل push على `main` ينشر تلقائياً على الـ VPS بدون تدخل يدوي.
- [ ] النودات (Mysterium/Storj) تتصل تلقائياً عند إقلاع السيرفر، ويعيد الاتصال تلقائياً عند الفشل.
- [ ] لوحة التحكم تعرض حالة حية لكل الحاويات والنودات والتكلفة والدخل.
- [ ] لا توجد بيانات حساسة (مفاتيح، محافظ، identities) مرفوعة على GitHub.
- [ ] إمكانية إضافة شبكة جديدة بتعديل بسيط في الكود والـ `docker-compose.yml`.

---

## 📝 ملاحظات مفتوحة (تحتاج قرار لاحق)

- التقنية النهائية للوحة التحكم (Node.js vs Python، React vs Vue...).
- هل سيتم استضافة control-panel على نفس الـ VPS أم سيرفر منفصل؟
- نطاق (domain) مخصص للوحة التحكم مع طبقة مصادقة (Authentication) لحمايتها من الوصول العام.
- تحديد الاستراتيجية الأمثل لـ Mysterium (Consumer vs Provider) بناءً على العائد والـ bandwidth المتاح.
