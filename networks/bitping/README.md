# Bitping

شبكة network monitoring لامركزية — تدفع NOIA tokens مقابل uptime وأداء الشبكة.

## التسجيل

1. اذهب إلى <https://app.bitping.com> وأنشئ حساباً
2. ضع بيانات الحساب في `.env`:

```env
BITPING_EMAIL=your@email.com
BITPING_PASSWORD=your_password
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,bitping
```

## ملاحظات

- ✅ **يملك API محلي** — الأرباح تظهر مباشرة في لوحة NodePIN
- السيرفر ذو الـ uptime العالي = نقاط أكثر = tokens أكثر
- الـ credentials تُحفظ في volume `nodepin_bitping_data` بشكل آمن
- العملة: **NOIA** — قابلة للتداول على DEX

## Docker Image

```
bitping/bitping-node:latest
```
