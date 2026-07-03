# PacketStream (packetstream)

## الوظيفة
مشاركة عرض النطاق (bandwidth) مقابل أرباح. شبكة خفيفة لا تحتاج قرصاً أو منافذ مفتوحة — تناسب أي جهاز لديه اتصال إنترنت.

## التفعيل / الحذف
- **للتفعيل:** أضف `packetstream` إلى `ENABLED_NETWORKS` في `.env`.
- **للحذف:** احذفه من `ENABLED_NETWORKS` ثم `make up`.

## المتغيرات المطلوبة في `.env`
```
PACKETSTREAM_CID=your_packetstream_cid
```
تحصل على `CID` من لوحة PacketStream (قسم تشغيل عبر Docker).

## الأرباح
لا توفّر PacketStream API محلي للأرباح؛ تُعرض فقط على لوحتها:
https://packetstream.io/dashboard

## ملاحظات
- لا توجد منافذ تُنشر؛ الحاوية صادرة فقط (outbound).
- لا تُرفع `PACKETSTREAM_CID` لـ Git أبداً.
