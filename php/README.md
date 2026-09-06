# 🎓 راهنمای کامل نصب و اجرای پروژه حسابداری و مدیریت آموزشگاه غزال با PHP

این پروژه نسخه کاملاً بازنویسی شده به زبان **PHP (PDO)** و دیتابیس **MySQL** برای سیستم ثبت‌نام، مدیریت مالی، حقوق و دستمزد و هزینه‌های آموزشگاه زبان **غزال** است.

---

## 🚀 ویژگی‌های کلیدی نسخه PHP

1. **معماری تمیز و نوین**: استفاده از `PDO` با ایمنی بالا در برابر SQL Injection و UTF-8 کامل (`utf8mb4`).
2. **کامل‌ترین API RESTful**: اکشن‌های کامل (`api.php`) جهت ورود کاربر، ثبت زبان‌آموزان، مدیریت ترم‌ها، حقوق اساتید، هزینه‌ها، رسیدها و سطوح آموزشی.
3. **نصب‌کننده خودکار (Installer)**: فایل `install.php` برای ساخت خودکار جداول دیتابیس و درج داده‌های اولیه با یک کلیک در مرورگر.
4. **رابط کاربری زیبا و پاسخگو (RTL UI)**: طراحی شده با **Tailwind CSS** و قلم **وزیرمتن** به همراه قابلیت پرینت رسید.
5. **قابلیت اجرا روی تمام هاست‌ها**: سازگار با cPanel، DirectAdmin، Liara، XAMPP، WAMP، Docker، Nginx و Apache.

---

## 📁 ساختار فایل‌های پروژه PHP

```text
/php
├── config.php    # تنظیمات اتصال به دیتابیس MySQL و هدرهای CORS و JSON
├── schema.sql    # اسکریپت دیتابیس (جداول users, terms, students, salaries, expenses, levels, receipts)
├── install.php   # نصب‌کننده خودکار دیتابیس در مرورگر
├── api.php       # کنترلر و روت‌های اصلی RESTful API
├── index.php     # پنل کاربری کامل با HTML/Tailwind/Vanilla JS
└── README.md     # راهنمای استفاده و مستندات
```

---

## 🛠️ مراحل نصب و راه اندازی روی هاست یا Localhost

### روش اول: استفاده از نصب‌کننده خودکار (پیشنهادی)

1. تمام فایل‌های پوشه `php` را به هاست خود (مثلاً `public_html`) منتقل کنید.
2. اطلاعات دیتابیس را در فایل `config.php` تنظیم کنید:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'نام_دیتابیس');
   define('DB_USER', 'نام_کاربری_دیتابیس');
   define('DB_PASS', 'رمز_عبور_دیتابیس');
   ```
3. در مرورگر آدرس زیر را باز کنید:
   `https://your-domain.com/install.php`
4. دکمه **"نصب و ساخت جدول‌های دیتابیس"** را بزنید تا تمام جداول و کاربران اولیه ساخته شوند.

---

### روش دوم: ایمپورت دستی SQL در phpMyAdmin

1. یک دیتابیس جدید به نام `ghazal_db` یا نام دلخواه ایجاد کنید.
2. وارد **phpMyAdmin** شوید و دیتابیس خود را انتخاب کنید.
3. از تب **Import**، فایل `schema.sql` را انتخاب کرده و اجرا کنید.
4. اطلاعات دیتابیس را در `config.php` وارد کنید.

---

## 🔑 اطلاعات ورود پیش‌فرض (Default Logins)

| نقش کاربر | نام کاربری (Username) | رمز عبور (Password) |
| :--- | :--- | :--- |
| **مدیر آموزشگاه (Manager)** | `admin` | `admin123` |
| **مسئول پذیرش (Reception)** | `reception` | `reception123` |

---

## 🌐 مستندات REST API (جدول روت‌ها)

تمام درخواست‌ها به فایل `api.php` با پارامتر `action` ارسال می‌شوند:

| متد | مسیر / URL | اکشن (Action) | توضیحات |
| :--- | :--- | :--- | :--- |
| `POST` | `api.php?action=login` | `login` | احراز هویت و ورود کاربر |
| `GET` | `api.php?action=terms` | `terms` | دریافت لیست ترم‌ها |
| `POST` | `api.php?action=terms` | `terms` | ایجاد ترم جدید |
| `PATCH` | `api.php?action=terms&id=1` | `terms` | ویرایش ترم |
| `DELETE` | `api.php?action=terms&id=1` | `terms` | حذف ترم |
| `GET` | `api.php?action=students` | `students` | دریافت لیست زبان‌آموزان |
| `POST` | `api.php?action=students` | `students` | ثبت‌نام زبان‌آموز جدید |
| `PATCH` | `api.php?action=students&id=1` | `students` | ثبت پرداخت شهریه و به‌روزرسانی بدهی |
| `DELETE` | `api.php?action=students&id=1` | `students` | حذف زبان‌آموز |
| `POST` | `api.php?action=students_batch` | `students_batch` | افزودن دسته‌جمعی زبان‌آموزان (Excel Import) |
| `GET` | `api.php?action=salaries` | `salaries` | لیست حقوق اساتید |
| `POST` | `api.php?action=salaries` | `salaries` | ثبت پرداخت حقوق |
| `GET` | `api.php?action=expenses` | `expenses` | لیست هزینه‌های جاری |
| `POST` | `api.php?action=expenses` | `expenses` | ثبت هزینه جدید |
| `GET` | `api.php?action=levels` | `levels` | لیست سطوح تحصیلی و شهریه‌ها |
| `GET` | `api.php?action=receipts&studentId=1` | `receipts` | تاریخچه رسیدهای چاپی زبان‌آموز |

---

## ☁️ استقرار روی پلتفرم لیارا (Liara deployment)

برای استقرار این پروژه روی سرویس ابری **لیارا (Liara)**:

1. یک **برنامه PHP** جدید در کنسول لیارا بسازید.
2. یک دیتابیس **MariaDB / MySQL** در کنسول لیارا ایجاد کنید.
3. در بخش متغیرهای محیطی (Environment Variables) برنامه PHP، متغیرهای زیر را تنظیم کنید:
   - `DB_HOST`: آدرس مانیفست دیتابیس لیارا
   - `DB_PORT`: `3306`
   - `DB_NAME`: نام دیتابیس ساخته شده
   - `DB_USER`: `root` یا نام کاربر دیتابیس
   - `DB_PASS`: رمز دیتابیس لیارا
4. فایل‌های پوشه `php` را آپلود یا با CLI دستور `liara deploy` را اجرا نمایید.
