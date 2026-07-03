# Uprock

شبكة Distributed AI inference لامركزية — تدفع UPT tokens.

## التسجيل

1. اذهب إلى <https://uprock.com> وأنشئ حساباً
2. ضع بيانات الحساب في `.env`:

```env
UPROCK_EMAIL=your@email.com
UPROCK_PASSWORD=your_password
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,uprock
```

## ملاحظات

- TGE قريب — الدخول المبكر يعني tokens أكثر
- لا يوجد API محلي — راجع نقاطك على <https://uprock.com/dashboard>
- العملة: **UPT Token**
- Docker image: `uprock/node:latest`
