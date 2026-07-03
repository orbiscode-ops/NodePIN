# Nodepay

شبكة AI bandwidth لامركزية — تدفع NC tokens. مرحلة مبكرة والدخول الآن يعني نقاط أكثر.

## التسجيل

1. اذهب إلى <https://app.nodepay.ai> وأنشئ حساباً
2. من القائمة: **Settings → API Token** — انسخ الـ Token
3. ضعه في `.env`:

```env
NODEPAY_TOKEN=your_nodepay_token_here
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,nodepay
```

## ملاحظات

- يعمل كـ headless browser داخل Docker
- لا يوجد API محلي — راجع النقاط على <https://app.nodepay.ai>
- العملة: **NC Token** — تُوزَّع عند الإطلاق الرسمي (TGE)
- الدخول المبكر = مضاعفة النقاط في Seasons الأولى

## Docker Image

```
anthill/nodepay:latest
```
