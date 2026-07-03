# Huddle01 Media Node

شبكة WebRTC/media لامركزية — تستخدم bandwidth السيرفر للبث والاجتماعات مقابل HUDL tokens.

## التسجيل

1. اذهب إلى <https://node.huddle01.com> وأنشئ حساباً
2. انسخ الـ API Key من إعداداتك:

```env
HUDDLE01_API_KEY=your_api_key
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,huddle01
```

## ملاحظات

- ✅ **يملك API محلي** — الأرباح تظهر مباشرة في لوحة NodePIN
- API endpoint: `http://nodepin_huddle01:4001/api/status`
- يحتاج فتح منفذ `4001` (قابل للتغيير عبر `HUDDLE01_PORT`)
- العملة: **HUDL Token**
- Docker image: `huddle01/media-node:latest`
