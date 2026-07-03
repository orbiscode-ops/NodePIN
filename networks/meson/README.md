# Meson Network

شبكة CDN لامركزية — تؤجّر bandwidth للمطورين مقابل MSN tokens.

## التسجيل

1. اذهب إلى <https://dashboard.meson.network> وأنشئ حساباً
2. من القائمة انسخ الـ Token وضعه في `.env`:

```env
MESON_TOKEN=your_meson_token
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,meson
```

## ملاحظات

- ✅ **يملك API محلي** — الأرباح تظهر مباشرة في لوحة NodePIN
- API endpoint: `http://nodepin_meson:19090/api/v1/stat`
- الدفع شهري بـ MSN tokens
- Docker image: `meson/meson-node:latest`
- يحتاج فتح منفذ `19090` (قابل للتغيير عبر `MESON_PORT`)
