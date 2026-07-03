# Grass (Wynd Network)

شبكة Web scraping لامركزية — تستخدم bandwidth السيرفر لجمع بيانات AI مقابل GRASS tokens.

## التسجيل

1. اذهب إلى <https://app.getgrass.io/register> وأنشئ حساباً
2. ضع بيانات الحساب في `.env`:

```env
GRASS_USER=your@email.com
GRASS_PASS=your_password
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,grass
```

## ملاحظات

- لا يوجد API محلي — راجع نقاطك على <https://app.getgrass.io/dashboard>
- العملة: **GRASS Token** — قابلة للتداول على DEX
- Docker image: `alexdcox/grass-node:latest`
