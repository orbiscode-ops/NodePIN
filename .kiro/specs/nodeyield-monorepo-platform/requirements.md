# Requirements Document

## Introduction

NodeYield هي منصة مفتوحة المصدر مبنية على Docker تُمكّن أي مطوّر من تشغيل عُقد (Nodes) لامركزية على VPS بهدف توليد دخل سلبي. تهدف هذه الـ feature إلى إعادة هيكلة المشروع الحالي إلى بنية **Monorepo** قابلة للتوسع بسهولة، مع إضافة دعم **Docker Profiles** لاختيار الشبكات انتقائياً، وتفعيل **GitHub Actions** للنشر التلقائي، وتبسيط عملية إضافة شبكات جديدة إلى حد الـ Plug-and-Play.

الحالة الحالية: `docker-compose.yml` موحد يشغّل كل الخدمات دفعة واحدة بدون انتقائية، ولا يوجد GitHub Actions بعد. المطلوب هو رفع هذا إلى بنية monorepo منظمة وقابلة للتوسع.

---

## Glossary

- **NodeYield_Platform**: المنصة الكاملة بما فيها هيكل الملفات وأدوات النشر.
- **Service_Module**: وحدة مستقلة تمثل شبكة لامركزية واحدة (مثل Mysterium أو Storj) داخل مجلد `services/{network-name}/`.
- **Compose_Orchestrator**: ملف `docker-compose.yml` الجذري الذي يُنسّق تشغيل كل الخدمات.
- **Profile_Selector**: آلية Docker Compose Profiles التي تسمح بتشغيل خدمة أو مجموعة خدمات محددة دون الأخريات.
- **Deploy_Workflow**: ملف GitHub Actions الذي يتولى النشر التلقائي على الـ VPS.
- **VPS**: الخادم الافتراضي الخاص (Virtual Private Server) الذي تعمل عليه العُقد.
- **Secret**: أي قيمة حساسة (مفتاح خاص، كلمة مرور، عنوان محفظة) يجب إبقاؤها خارج Git.
- **Control_Panel**: لوحة تحكم Node.js/Express الموجودة في `services/control-panel/` لمراقبة الحاويات.
- **Watchtower**: خدمة Docker تتحقق دورياً من تحديثات صور الحاويات وتطبّقها تلقائياً.
- **TequilAPI**: واجهة REST API المحلية لعقدة Mysterium على المنفذ 4050.
- **EARS**: نمط كتابة المتطلبات (Easy Approach to Requirements Syntax).

---

## Requirements

---

### Requirement 1: إعادة هيكلة المشروع إلى Monorepo

**User Story:** بوصفي مطوّراً يريد تشغيل NodeYield، أريد بنية مجلدات واضحة ومنظمة بحيث أجد كل ما يخص شبكة معينة في مكان واحد، وأستطيع تشغيل المشروع بدون التنقل في ملفات متشعبة.

#### Acceptance Criteria

1. THE NodeYield_Platform SHALL تنظيم كل شبكة لامركزية كـ Service_Module مستقل داخل مجلد `services/{network-name}/`.
2. THE NodeYield_Platform SHALL توفير ملف `docker-compose.yml` خاص داخل كل Service_Module يحتوي تعريف الخدمة الخاص بتلك الشبكة فقط، بحيث يمكن تشغيله بشكل مستقل بأمر `docker compose -f services/{network-name}/docker-compose.yml up -d`.
3. THE NodeYield_Platform SHALL توفير ملف `.env.example` خاص داخل كل Service_Module يحتوي متغيرات البيئة المطلوبة لتلك الشبكة فقط.
4. THE NodeYield_Platform SHALL توفير ملف `README.md` خاص داخل كل Service_Module يشرح: وظيفة الشبكة، المتطلبات المسبقة، خطوات الإعداد، والمنافذ المستخدمة.
5. THE Compose_Orchestrator SHALL يوجد في جذر المشروع ويتضمن تعريفات الخدمات مباشرةً من كل Service_Module مع تعيين profile مناسب لكل منها.
6. THE NodeYield_Platform SHALL توفير ملف `.env.example` في جذر المشروع يجمع كل المتغيرات من كل الشبكات، ويتضمن تعليق رأسي لكل شبكة بصيغة `# ── {NETWORK_NAME} ──` يفصل متغيراتها عن متغيرات الشبكات الأخرى.
7. THE NodeYield_Platform SHALL لا تتطلب تعديل أي ملف خارج `docker-compose.yml` الجذري و `.env.example` الجذري عند إضافة Service_Module جديد.

---

### Requirement 2: Docker Profiles لتشغيل الشبكات انتقائياً

**User Story:** بوصفي مطوّراً يريد تشغيل شبكة واحدة فقط دون البقية، أريد تحديد اسم الشبكة في أمر واحد وأحصل فقط على الحاويات التي أحتاجها تشغيلها.

#### Acceptance Criteria

1. THE Compose_Orchestrator SHALL تعيين حقل `profiles` لكل service في `docker-compose.yml` الجذري باسم يطابق اسم الشبكة (مثل: `mysterium`، `storj`) مع إضافة اسم `all` لكل خدمات الـ yield.
2. WHEN يُنفّذ المستخدم `docker compose --profile mysterium up -d`، THE Compose_Orchestrator SHALL تشغيل حاويات Mysterium فقط دون تشغيل حاويات شبكات yield الأخرى، بحيث يُظهر `docker compose ps` حاويات Mysterium فقط بحالة `running`.
3. WHEN يُنفّذ المستخدم `docker compose --profile storj up -d`، THE Compose_Orchestrator SHALL تشغيل حاويات Storj فقط دون تشغيل حاويات شبكات yield الأخرى، بحيث يُظهر `docker compose ps` حاويات Storj فقط بحالة `running`.
4. WHEN يُنفّذ المستخدم `docker compose --profile all up -d`، THE Compose_Orchestrator SHALL تشغيل كل الشبكات المُعرَّفة دفعة واحدة.
5. THE Control_Panel SHALL تُعيَّن لـ profile منفصل اسمه `monitoring` بحيث يمكن تشغيلها مستقلة عن شبكات الـ yield بأمر `docker compose --profile monitoring up -d`.
6. THE Watchtower SHALL تُعيَّن لـ profile منفصل اسمه `monitoring` بحيث تُشغَّل جنباً إلى جنب مع لوحة التحكم عند تفعيل profile `monitoring`.
7. THE NodeYield_Platform SHALL توثيق في `README.md` أن تنفيذ `docker compose up` بدون تحديد profile لن يُشغّل أي خدمة، مع ذكر الأمر الصحيح للبدء.
8. THE Compose_Orchestrator SHALL دعم تشغيل profile شبكة yield وprofile `monitoring` معاً في نفس الأمر باستخدام `docker compose --profile mysterium --profile monitoring up -d`.

---

### Requirement 3: GitHub Actions — نشر انتقائي عبر Workflow Dispatch

**User Story:** بوصفي مطوّراً يريد نشر تغيير لشبكة Mysterium فقط دون إزعاج شبكة Storj، أريد تشغيل workflow من واجهة GitHub واختيار الشبكة المستهدفة يدوياً.

#### Acceptance Criteria

1. THE Deploy_Workflow SHALL يدعم حدث `workflow_dispatch` من واجهة GitHub Actions مع مدخل إلزامي `network` من نوع `choice` لا يقبل قيمة فارغة.
2. THE Deploy_Workflow SHALL يعرض خيارات الـ `network` التالية كحد أدنى: `mysterium`، `storj`، `monitoring`، `all`، مع تعيين `all` كقيمة افتراضية.
3. WHEN يختار المستخدم `network: mysterium`، THE Deploy_Workflow SHALL الاتصال بالـ VPS عبر SSH وتنفيذ `docker compose --profile mysterium pull && docker compose --profile mysterium up -d` فقط دون المساس بباقي الخدمات الجارية.
4. WHEN يختار المستخدم `network: all`، THE Deploy_Workflow SHALL الاتصال بالـ VPS عبر SSH وتنفيذ `docker compose --profile all pull && docker compose --profile all up -d`.
5. THE Deploy_Workflow SHALL قراءة بيانات الاتصال بالـ VPS من GitHub Secrets حصراً بأسماء: `VPS_SSH_KEY`، `VPS_HOST`، `VPS_USER`، دون تضمين أي قيمة منها في ملفات الـ workflow المحفوظة في Git.
6. IF فشل الاتصال بالـ VPS (SSH timeout أو connection refused)، THEN THE Deploy_Workflow SHALL تسجيل رسالة خطأ واضحة تتضمن سبب الفشل وإيقاف الـ workflow بحالة فشل (exit code غير صفري).
7. IF نجح الاتصال بالـ VPS لكن فشل أمر `docker compose` (exit code غير صفري)، THEN THE Deploy_Workflow SHALL تسجيل آخر 50 سطر من الـ Docker logs للخدمة المستهدفة وإيقاف الـ workflow بحالة فشل.
8. WHEN يحدث push إلى فرع `main` يُعدّل ملفات كود داخل `services/mysterium/**` (باستثناء تغييرات الـ documentation فقط مثل `*.md`)، THE Deploy_Workflow SHALL تشغيل نشر خدمة `mysterium` تلقائياً بدون تدخل يدوي.
9. WHEN يحدث push إلى فرع `main` يُعدّل ملفات كود داخل `services/storj/**` (باستثناء تغييرات الـ documentation فقط مثل `*.md`)، THE Deploy_Workflow SHALL تشغيل نشر خدمة `storj` تلقائياً بدون تدخل يدوي.
10. IF يحدث push إلى `main` يُعدّل ملفات في `services/mysterium/**` و`services/storj/**` معاً في نفس الـ commit، THEN THE Deploy_Workflow SHALL تشغيل نشر `all` بدلاً من تشغيل نشرين متوازيين.
11. WHEN يُنفَّذ الـ Deploy_Workflow، THE Deploy_Workflow SHALL التحقق من توفر `docker` و`docker compose` على الـ VPS قبل تنفيذ أي أمر نشر؛ IF غاب أحدهما THEN يوقف الـ workflow بخطأ يذكر الأداة المفقودة.

---

### Requirement 4: آلية إضافة شبكة جديدة — Plug-and-Play

**User Story:** بوصفي مطوّراً يريد إضافة شبكة PacketStream إلى NodeYield، أريد اتباع خطوات موثقة ومحددة تُدرج الشبكة الجديدة في المنصة دون تعديل منطق أساسي أو ملفات بنية المنصة.

#### Acceptance Criteria

1. THE NodeYield_Platform SHALL توفير مجلد `services/_template/` يحتوي قالباً جاهزاً يتضمن: `docker-compose.yml` نموذجي مع كل الحقول الإلزامية، `.env.example` مُعلَّق، و`README.md` بصيغة محددة.
2. WHEN يُنشئ المطوّر مجلداً جديداً تحت `services/{new-network}/` يحتوي على ثلاثة ملفات: `docker-compose.yml` بحقل `profiles` صحيح، `.env.example` بقيم placeholder، و`README.md` بالأقسام المطلوبة، THE NodeYield_Platform SHALL اعتبار هذه الشبكة وحدة مكتملة يمكن تشغيلها بعد إضافة تعريفها لـ `docker-compose.yml` الجذري.
3. THE قالب_Service_Module SHALL يتطلب وجود حقل `profiles` في تعريف كل Docker service يحتوي على اسم الشبكة واسم `all` كحد أدنى، بصيغة: `profiles: ["{network-name}", "all"]`.
4. THE NodeYield_Platform SHALL توفير قسم "إضافة شبكة جديدة" في `README.md` الجذري يشرح الخطوات في 7 خطوات أو أقل: نسخ القالب، تعديل `docker-compose.yml` الخاص، تعديل `.env.example`، تحديث `docker-compose.yml` الجذري، تحديث `.env.example` الجذري، الاختبار المحلي، والرفع.
5. WHEN تُضاف شبكة جديدة باتباع القالب وإضافة اسمها في مدخل `network` بملف الـ workflow، THE Deploy_Workflow SHALL تنفيذ النشر بنفس المنطق المستخدم للشبكات الحالية دون تعديل كود الـ workflow.
6. THE NodeYield_Platform SHALL توفير script `scripts/test-service.sh` يقبل اسم الشبكة كمعامل وينفذ: التحقق من وجود الملفات المطلوبة، التحقق من صحة `docker-compose.yml`، وتشغيل الخدمة محلياً مع الانتظار 30 ثانية والتحقق من حالة `running`.

---

### Requirement 5: إدارة الأسرار والأمان

**User Story:** بوصفي مطوّراً يريد نشر NodeYield على GitHub كمشروع مفتوح المصدر، أريد ضمان أن أي بيانات حساسة (مفاتيح، محافظ، كلمات مرور) لن تظهر في سجل Git أبداً.

#### Acceptance Criteria

1. THE NodeYield_Platform SHALL استخدام ملف `.env` (مستثنى من Git) كمصدر وحيد لكل Secrets وقت التشغيل، ولا تُضمَّن أي قيمة Secret مباشرةً في ملفات الكود أو ملفات `docker-compose.yml` أو ملفات الـ workflows المحفوظة في Git.
2. THE NodeYield_Platform SHALL توفير ملف `.gitignore` يتضمن صراحةً: `.env`، `*.env`، `**/.env`، وأي ملف يطابق الأنماط `*secret*`، `*credential*`.
3. THE NodeYield_Platform SHALL توفير ملف `.env.example` لا يحتوي على أي قيمة حقيقية؛ كل قيمة placeholder يجب أن تحتوي على إحدى العبارات: `your_`، `_here`، أو `change_this`.
4. WHEN يُنفَّذ Deploy_Workflow، THE Deploy_Workflow SHALL قراءة بيانات الاتصال بالـ VPS من GitHub Secrets بأسماء محددة (`VPS_SSH_KEY`، `VPS_HOST`، `VPS_USER`) حصراً، دون أن تظهر قيم هذه الـ Secrets في أي ملف workflow مُودَع في Git.
5. THE NodeYield_Platform SHALL توفير `.gitignore` يمنع رفع أي ملف يطابق: `.env`، `*.env`، `**/.env` من أي مستوى في شجرة المجلدات.
6. THE Control_Panel SHALL تصفية (filter) جميع متغيرات البيئة التي تحتوي على الكلمات: `PASS`، `KEY`، `SECRET`، `TOKEN`، `WALLET` (مقارنة case-insensitive) من جميع استجابات `/api/*` endpoints قبل إرسالها للعميل.
7. WHEN يبدأ تشغيل Control_Panel مع قيمة `API_KEY` فارغة أو غير مُعيَّنة، THE Control_Panel SHALL طباعة رسالة تحذير على `stdout` بصيغة `[WARN] API authentication is disabled. Set API_KEY to enable.` مع السماح بالوصول لجميع endpoints.
8. WHEN يصل طلب HTTP إلى أي endpoint تحت `/api/*` بعد تعيين `API_KEY` بقيمة غير فارغة، THE Control_Panel SHALL رفضه بكود HTTP 401 إذا كان الـ header `X-API-Key` مفقوداً أو لا يطابق قيمة `API_KEY` المُعيَّنة.

---

### Requirement 6: شبكة Mysterium — تشغيل مستقر وقابل للتهيئة

**User Story:** بوصفي مشغّل عقدة Mysterium، أريد تهيئة العقدة عبر متغيرات بيئة فقط دون تعديل الصور أو الملفات الداخلية، مع ضمان إعادة الاتصال تلقائياً عند أي انقطاع.

#### Acceptance Criteria

1. THE Service_Module_Mysterium SHALL استخدام صورة `mysteriumnetwork/myst:latest` بدون تعديل أو bespoke Dockerfile.
2. THE Service_Module_Mysterium SHALL قبول تهيئة passphrase الهوية عبر متغير `MYST_IDENTITY_PASSPHRASE` في `.env`.
3. THE Service_Module_Mysterium SHALL قبول تهيئة فلتر الدول عبر متغير `MYST_COUNTRY_FILTER` في `.env` بقيمة افتراضية `us`.
4. THE Service_Module_Mysterium SHALL قبول تهيئة الحد الأقصى لمدة الجلسة عبر متغير `MYST_MAX_SESSION_MINUTES` في `.env` بقيمة افتراضية `30`.
5. THE Service_Module_Mysterium SHALL تحديد `restart: unless-stopped` لضمان إعادة التشغيل التلقائي عند إقلاع الـ VPS أو فشل الحاوية.
6. THE Service_Module_Mysterium SHALL تثبيت (mount) volume دائم لحفظ بيانات الهوية في `myst-data:/var/lib/mysterium-node` لمنع فقدان الهوية عند إعادة تشغيل الحاوية.
7. THE Service_Module_Mysterium SHALL كشف المنفذ `4050` لـ TequilAPI و`4449` للواجهة الرسومية على الـ host.
8. THE Service_Module_Mysterium SHALL يتطلب `cap_add: NET_ADMIN` في تعريف Docker لعمل النفق الشبكي بشكل صحيح.

---

### Requirement 7: شبكة Storj — تشغيل مستقر وقابل للتهيئة

**User Story:** بوصفي مشغّل عقدة Storj، أريد تهيئة حجم التخزين وعنوان المحفظة ومعلومات الاتصال عبر متغيرات بيئة، مع الحفاظ على بيانات الـ identity والـ storage عند إعادة تشغيل الخادم.

#### Acceptance Criteria

1. THE Service_Module_Storj SHALL استخدام صورة `storjlabs/storagenode:latest` بدون تعديل.
2. THE Service_Module_Storj SHALL قبول عنوان محفظة Ethereum عبر متغير `STORJ_WALLET` في `.env`.
3. THE Service_Module_Storj SHALL قبول بريد إلكتروني للتسجيل عبر متغير `STORJ_EMAIL` في `.env`.
4. THE Service_Module_Storj SHALL بناء عنوان الاتصال العام تلقائياً بصيغة `${NODEYIELD_VPS_IP}:28967` من متغير `NODEYIELD_VPS_IP`.
5. THE Service_Module_Storj SHALL قبول حجم التخزين المخصص عبر متغير `STORJ_STORAGE_SIZE` بقيمة افتراضية `500GB`.
6. THE Service_Module_Storj SHALL قبول حد الـ bandwidth المخصص عبر متغير `STORJ_BANDWIDTH` بقيمة افتراضية `100TB`.
7. THE Service_Module_Storj SHALL تثبيت volume دائم لحفظ ملفات الإعداد في `storj-data:/app/config`.
8. THE Service_Module_Storj SHALL تثبيت مسار التخزين الفعلي من الـ host `/mnt/storj-storage` إلى `/app/storage` داخل الحاوية.
9. THE Service_Module_Storj SHALL كشف المنفذين `28967` (TCP وUDP) للاتصال بالشبكة و`14002` للواجهة الرسومية.
10. THE Service_Module_Storj SHALL تحديد `restart: unless-stopped` لضمان إعادة التشغيل التلقائي.

---

### Requirement 8: لوحة التحكم — مراقبة موحدة للحاويات

**User Story:** بوصفي مشغّل NodeYield، أريد مراقبة حالة كل حاوياتي من مكان واحد عبر متصفح الويب دون الحاجة للاتصال بالـ VPS عبر SSH في كل مرة.

#### Acceptance Criteria

1. THE Control_Panel SHALL كشف endpoint `GET /api/health` يُعيد JSON يحتوي على `status` و`timestamp`.
2. THE Control_Panel SHALL كشف endpoint `GET /api/containers` يُعيد قائمة بكل حاويات Docker الموجودة على الـ host مع: الاسم، الصورة، الحالة، المنافذ.
3. THE Control_Panel SHALL كشف endpoint `GET /api/containers/:name` يُعيد تفاصيل حاوية محددة تشمل: الحالة، صحة الـ health check، وقت البدء، والصورة.
4. WHEN يطلب المستخدم تفاصيل حاوية، THE Control_Panel SHALL استثناء أي متغيرات بيئة تحتوي على `PASS` أو `KEY` أو `SECRET` أو `TOKEN` أو `WALLET` من الاستجابة.
5. THE Control_Panel SHALL الاتصال بـ Docker Engine عبر Unix socket `/var/run/docker.sock` المُثبَّت بصلاحية قراءة فقط (`:ro`).
6. THE Control_Panel SHALL خدمة ملفات الواجهة الرسومية الثابتة من مجلد `public/`.
7. WHEN تكون `API_KEY` محددة في `.env`، THE Control_Panel SHALL تطبيق التحقق منها على كل endpoints تحت مسار `/api/`.
8. THE Control_Panel SHALL تشغيل على المنفذ المحدد في `DASHBOARD_PORT` بقيمة افتراضية `3000`.

---

### Requirement 9: Watchtower — تحديث تلقائي للصور

**User Story:** بوصفي مشغّل NodeYield، أريد أن تُحدَّث صور Docker تلقائياً في الخلفية دون تدخل يدوي مني، مع حذف الصور القديمة لتوفير مساحة الـ disk.

#### Acceptance Criteria

1. THE Watchtower SHALL مراقبة كل الحاويات الجارية على الـ host والتحقق من توفر تحديثات لصورها.
2. THE Watchtower SHALL فحص التحديثات بفترة زمنية قابلة للتهيئة عبر متغير بيئة مخصص، بقيمة افتراضية `3600` ثانية، ويُقبل أي قيمة موجبة بالثواني كفترة فحص.
3. WHEN تتوفر نسخة أحدث من صورة حاوية جارية، THE Watchtower SHALL تحديثها وإعادة تشغيلها تلقائياً.
4. IF لم تتوفر نسخة أحدث لصورة حاوية عند دورة الفحص، THEN THE Watchtower SHALL عدم إعادة تشغيل تلك الحاوية.
5. THE Watchtower SHALL تعيين `restart: unless-stopped` لضمان عمله المستمر.

---

### Requirement 10: تجربة الإعداد — تشغيل بأمر واحد

**User Story:** بوصفي مطوّراً يكتشف NodeYield لأول مرة، أريد تشغيل المشروع في أقل من 5 دقائق باتباع README بدون خبرة مسبقة بمعمارية المشروع.

#### Acceptance Criteria

1. THE NodeYield_Platform SHALL توفير ملف `README.md` جذري يشرح خطوات الإعداد الكاملة في تسلسل لا يتجاوز 5 خطوات رئيسية كحد أقصى.
2. THE NodeYield_Platform SHALL توفير قسم "التشغيل السريع" في `README.md` يُميّز بوضوح بين المتغيرات الإلزامية (التي لا تملك قيمة افتراضية في `.env.example`) والمتغيرات الاختيارية (التي تملك قيمة افتراضية)، مع ذكر القيم الافتراضية للاختيارية صراحةً.
3. THE NodeYield_Platform SHALL توثيق كل متغير في `.env.example` بتعليق يشرح: وظيفته، القيم المقبولة أو مثال على القيمة، القيمة الافتراضية إن وُجدت، وما إذا كان إلزامياً أم اختيارياً.
4. WHEN يُنفّذ المطوّر `cp .env.example .env` ثم يُعدّل المتغيرات الإلزامية فقط ثم يُنفّذ `docker compose --profile {network} up -d` على VPS يحتوي Docker وDocker Compose، THE Compose_Orchestrator SHALL تشغيل الشبكة المختارة بنجاح مُتحقَّق منه بعرض كل الحاويات المعنية بحالة `running` في `docker compose ps`.
5. THE NodeYield_Platform SHALL توفير قسم "استكشاف الأخطاء وإصلاحها" في `README.md` يُغطي 5 مشاكل شائعة على الأقل، كل مشكلة تتضمن: الأعراض الملاحَظة، السبب الأكثر احتمالاً، وأمر أو إجراء محدد لإصلاحها.
6. THE NodeYield_Platform SHALL توفير قسم "إضافة شبكة جديدة" في `README.md` يشرح هيكل Service_Module مع مثال كامل يتضمن: مقتطف `docker-compose.yml` نموذجي، محتوى `.env.example` نموذجي، وهيكل `README.md` المطلوب.
