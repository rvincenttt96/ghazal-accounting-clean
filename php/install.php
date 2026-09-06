<?php
/**
 * نصب‌کننده خودکار دیتابیس آموزشگاه غزال
 * Ghazal Language Academy Database Installer
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

$message = '';
$error = '';

if (isset($_POST['install'])) {
    try {
        $sql = file_get_contents(__DIR__ . '/schema.sql');
        $pdo = getDbConnection();
        $pdo->exec($sql);
        $message = "✅ دیتابیس با موفقیت ایجاد و جدول‌ها و داده‌های اولیه نصب شدند!";
    } catch (Exception $e) {
        $error = "❌ خطا در نصب دیتابیس: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نصب سیستم حسابداری غزال</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
    <style>body { font-family: 'Vazirmatn', sans-serif; }</style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-slate-200">
        <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            🎓
        </div>
        <h1 class="text-2xl font-extrabold text-slate-800 mb-2">راه اندازی سیستم غزال (PHP)</h1>
        <p class="text-slate-500 text-sm mb-6">ساخت خودکار جداول دیتابیس MySQL و درج داده‌های اولیه</p>

        <?php if ($message): ?>
            <div class="bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-xl text-sm mb-6">
                <?php echo $message; ?>
            </div>
            <a href="index.php" class="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20">
                ورود به برنامه
            </a>
        <?php elseif ($error): ?>
            <div class="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl text-sm mb-6">
                <?php echo $error; ?>
            </div>
            <form method="POST">
                <button type="submit" name="install" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition">
                    تلاش مجدد نصب
                </button>
            </form>
        <?php else: ?>
            <div class="bg-slate-50 p-4 rounded-xl text-right text-xs text-slate-600 mb-6 space-y-2 border border-slate-200">
                <p><strong>تنظیمات دیتابیس فعلی:</strong></p>
                <p>• آدرس هوسـت: <code class="text-blue-600"><?php echo DB_HOST; ?></code></p>
                <p>• نام دیتابیس: <code class="text-blue-600"><?php echo DB_NAME; ?></code></p>
                <p>• نام کاربری: <code class="text-blue-600"><?php echo DB_USER; ?></code></p>
            </div>
            <form method="POST">
                <button type="submit" name="install" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20">
                    نصب و ساخت جدول‌های دیتابیس
                </button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
