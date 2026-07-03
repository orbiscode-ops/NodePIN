# Proxyrack

شبكة Proxy تجارية — تدفع USD مقابل الـ bandwidth. ~64MB RAM فقط.

## التسجيل

1. اذهب إلى <https://peer.proxyrack.com> وأنشئ حساباً
2. انسخ الـ UUID والـ API Key من الإعدادات:

```env
PROXYRACK_UUID=your_uuid
PROXYRACK_API_KEY=your_api_key
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,proxyrack
```

## ملاحظات

- من أخف الشبكات — لا يؤثر على أداء السيرفر
- لا يوجد API محلي — راجع أرباحك على <https://peer.proxyrack.com/dashboard>
- الدفع عبر PayPal
- Docker image: `proxyrack/pop:latest`
