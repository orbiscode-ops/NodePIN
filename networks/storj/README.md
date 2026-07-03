# Storj Node

## الوظيفة
مشاركة مساحة تخزين لامركزية مقابل رمز STORJ.

## الإضافة/الحذف
- **للحذف:** احذف سطور `storj-node` من `docker-compose.yml`.
- **للإضافة:** أضف السطور مرة أخرى.

## المتغيرات المطلوبة في `.env`
```
STORJ_WALLET=your_ethereum_wallet_address
STORJ_EMAIL=your_email@example.com
STORJ_STORAGE_SIZE=500GB
STORJ_BANDWIDTH=100TB
NODEYIELD_VPS_IP=your_server_ip
```

## المنافذ
- `28967/tcp+udp` — اتصال الشبكة
- `14002` — Web Dashboard لـ Storj

## ملاحظات
- identity تُنشأ أول مرة وتُحفظ داخل `storj-data` volume.
- تأكد من إعداد port forwarding إذا كان هناك جدار حماية خارجي.
