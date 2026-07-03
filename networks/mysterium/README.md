# Mysterium Network (myst_client)

## الوظيفة
نود Mysterium يعمل في وضع Consumer أو Provider حسب الـ identity المُسجّل.

## الإضافة/الحذف
- **للحذف:** احذف سطور `myst_client` من `docker-compose.yml`.
- **للإضافة:** أضف السطور مرة أخرى.

## المتغيرات المطلوبة في `.env`
```
MYST_IDENTITY_PASSPHRASE=your_passphrase
MYST_COUNTRY_FILTER=us
MYST_MAX_SESSION_MINUTES=30
MYST_API_URL=http://127.0.0.1:4050
```

## المنافذ
- `4050` — TequilAPI
- `4449` — Web UI الخاصة بـ Mysterium

## ملاحظات
- identity تقنية تُنشأ عند أول تشغيل أو تُستورد.
- لا تُرفع `MYST_IDENTITY_PASSPHRASE` أبداً لـ Git.
