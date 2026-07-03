# Titan Network

شبكة Edge computing + storage لامركزية — تدفع TTN tokens.

## التسجيل

1. اذهب إلى <https://storage.titannet.io> وأنشئ حساباً
2. احصل على Activation Hash من لوحة التحكم وضعه في `.env`:

```env
TITAN_HASH=your_activation_hash
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,titan
```

## ملاحظات

- يكمل Storj — تخزين + bandwidth معاً
- لا يوجد API محلي — راجع نقاطك على <https://storage.titannet.io/dashboard>
- الـ Hash يُحفظ في volume `nodepin_titan_data` بشكل آمن
- العملة: **TTN Token**
- Docker image: `nezha123/titan-edge:latest`
