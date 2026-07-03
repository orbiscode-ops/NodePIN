# EarnApp (Bright Data)

مشاركة bandwidth مع شبكة Bright Data مقابل أرباح بالدولار.

## التسجيل

1. اذهب إلى <https://earnapp.com> وأنشئ حساباً
2. أنشئ UUID خاص بجهازك: <https://earnapp.com/i/sdk-node-uuid>
3. انسخ الـ UUID وضعه في `.env`:

```env
EARNAPP_UUID=sdk-node-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## تفعيل الشبكة

```env
ENABLED_NETWORKS=...,earnapp
```

## ملاحظات

- **Datacenter IP** مقبول لكن أرباحه أقل من Residential — الـ uptime الدائم يعوّض.
- لا يوجد API محلي — راجع أرباحك على <https://earnapp.com/dashboard>
- الدفع عبر PayPal، Amazon Gift Cards، أو Bitcoin.
- الحد الأدنى للسحب: **$2.50**

## Docker Image

```
mrcolorrain/earnapp:latest
```
