# Grass (grass)

## الوظيفة
مشاركة عرض النطاق (bandwidth) مقابل نقاط/أرباح. شبكة خفيفة لا تحتاج قرصاً أو منافذ مفتوحة — تناسب أي جهاز.

## التفعيل / الحذف
- **للتفعيل:** أضف `grass` إلى `ENABLED_NETWORKS` في `.env`.
- **للحذف:** احذفه من `ENABLED_NETWORKS` ثم `make up`.

## المتغيرات المطلوبة في `.env`
```
GRASS_USER=your_grass_email
GRASS_PASS=your_grass_password
```
بيانات حساب Grass الخاص بك.

## الأرباح
لا توفّر Grass API محلي للأرباح؛ تُعرض فقط على لوحتها:
https://app.getgrass.io

## ملاحظات
- لا توجد منافذ تُنشر؛ الحاوية صادرة فقط (outbound).
- لا تُرفع بيانات Grass لـ Git أبداً.
