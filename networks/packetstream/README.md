# PacketStream

مشاركة bandwidth غير مستخدم مقابل USD — $0.10 لكل GB.

## التسجيل

1. اذهب إلى <https://packetstream.io> وأنشئ حساباً
2. انسخ الـ CID من لوحة التحكم وضعه في `.env`:

```env
PACKETSTREAM_CID=your_cid
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,packetstream
```

## ملاحظات

- أخف شبكة في المشروع — ~64MB RAM فقط
- لا يوجد API محلي — راجع أرباحك على <https://packetstream.io/dashboard>
- الدفع عبر PayPal
- Docker image: `packetstream/psclient:latest`
