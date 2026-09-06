<?php
/**
 * پنل حسابداری و ثبت نام آموزشگاه زبان غزال (نسخه کامل PHP)
 * Ghazal Language Academy - Complete PHP Application Interface
 */
session_start();
require_once __DIR__ . '/config.php';

// خروج از حساب کاربری
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit;
}

// بررسی لاگین کاربر
$user = $_SESSION['user'] ?? null;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?");
        $stmt->execute([$username, $password]);
        $found = $stmt->fetch();

        if ($found) {
            $_SESSION['user'] = $found;
            $user = $found;
        } else {
            $error = 'نام کاربری یا رمز عبور اشتباه است.';
        }
    } catch (Exception $e) {
        $error = 'خطا در اتصال به دیتابیس: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>حسابداری غزال - سیستم مدیریت آموزشگاه زبان (PHP)</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Vazirmatn Persian Font -->
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
        @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen">

<?php if (!$user): ?>
    <!-- ========================================== -->
    <!-- صفحه ورود به سیستم (LOGIN PAGE)            -->
    <!-- ========================================== -->
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div class="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20">
            <div class="text-center mb-8">
                <div class="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-extrabold shadow-lg shadow-blue-500/30">
                    غزال
                </div>
                <h1 class="text-2xl font-black text-slate-800">آموزشگاه زبان غزال</h1>
                <p class="text-slate-500 text-sm mt-1">سیستم جامع ثبت‌نام و مدیریت مالی (PHP Edition)</p>
            </div>

            <?php if ($error): ?>
                <div class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                    <span>⚠️</span> <span><?php echo htmlspecialchars($error); ?></span>
                </div>
            <?php endif; ?>

            <form method="POST" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">نام کاربری</label>
                    <input type="text" name="username" required placeholder="admin یا reception"
                           class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">رمز عبور</label>
                    <input type="password" name="password" required placeholder="••••••••"
                           class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-sm">
                </div>
                <button type="submit" name="login"
                        class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/30">
                    ورود به سیستم
                </button>
            </form>

            <div class="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 space-y-1">
                <p>💡 اطلاعات پیش‌فرض ورود:</p>
                <p>مدیر: <code class="text-blue-600 font-bold">admin</code> / <code class="text-blue-600">admin123</code></p>
                <p>پذیرش: <code class="text-blue-600 font-bold">reception</code> / <code class="text-blue-600">reception123</code></p>
                <div class="mt-4">
                    <a href="install.php" class="text-xs text-blue-500 hover:underline">🛠️ راه اندازی اولیه دیتابیس (Installer)</a>
                </div>
            </div>
        </div>
    </div>

<?php else: ?>
    <!-- ========================================== -->
    <!-- پنل اصلی برنامه (MAIN APP DASHBOARD)      -->
    <!-- ========================================== -->
    <div class="min-h-screen flex flex-col md:flex-row">
        
        <!-- نوار کناری (Sidebar) -->
        <aside class="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col justify-between border-b md:border-b-0 md:border-l border-slate-800">
            <div>
                <!-- هدر لوگو -->
                <div class="flex items-center gap-3 mb-8">
                    <div class="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">
                        غزال
                    </div>
                    <div>
                        <h2 class="font-bold text-base text-white">آموزشگاه غزال</h2>
                        <span class="text-xs text-blue-400 font-medium">نسخه PHP & MySQL</span>
                    </div>
                </div>

                <!-- منوی ناوبری -->
                <nav class="space-y-2">
                    <a href="#overview" onclick="switchTab('overview')" id="tab-overview"
                       class="nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition bg-blue-600 text-white">
                        📊 <span>نمای کلی مالی</span>
                    </a>
                    <a href="#registration" onclick="switchTab('registration')" id="tab-registration"
                       class="nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition text-slate-400 hover:bg-slate-800 hover:text-white">
                        🎓 <span>ثبت‌نام زبان‌آموزان</span>
                    </a>
                    <a href="#payroll" onclick="switchTab('payroll')" id="tab-payroll"
                       class="nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition text-slate-400 hover:bg-slate-800 hover:text-white">
                        💳 <span>حقوق و دستمزد</span>
                    </a>
                    <a href="#expenses" onclick="switchTab('expenses')" id="tab-expenses"
                       class="nav-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition text-slate-400 hover:bg-slate-800 hover:text-white">
                        💸 <span>هزینه‌های جاری</span>
                    </a>
                </nav>
            </div>

            <!-- مشخصات کاربر و خروج -->
            <div class="pt-6 border-t border-slate-800 mt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-slate-200"><?php echo htmlspecialchars($user['username']); ?></p>
                        <p class="text-[10px] text-slate-400"><?php echo $user['role'] === 'manager' ? 'مدیر سیستم' : 'مسئول پذیرش'; ?></p>
                    </div>
                    <a href="?logout=1" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition">
                        خروج 🚪
                    </a>
                </div>
            </div>
        </aside>

        <!-- محتوای اصلی (Main Content Area) -->
        <main class="flex-1 p-4 md:p-8 overflow-y-auto">
            
            <!-- هدر بالای صفحه -->
            <header class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 id="page-title" class="text-2xl font-black text-slate-800">نمای کلی و آمار مالی</h1>
                    <p class="text-xs text-slate-500 mt-1">مدیریت درآمدها، هزینه‌ها و بدهی‌های آموزشگاه غزال</p>
                </div>
                
                <!-- انتخاب ترم فعال -->
                <div class="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    <span class="text-xs font-bold text-slate-500 mr-2">ترم فعال:</span>
                    <select id="term-select" onchange="loadData()" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none">
                        <option value="all">همه ترم‌ها</option>
                    </select>
                </div>
            </header>

            <!-- بخش ۱: نمای کلی (Overview Section) -->
            <section id="section-overview" class="tab-content space-y-6">
                <!-- کارت‌های آماری -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <span class="text-xs font-bold text-slate-400 block mb-1">کل دریافتی زبان‌آموزان</span>
                        <div class="text-xl font-black text-emerald-600" id="stat-total-paid">۰ تومان</div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <span class="text-xs font-bold text-slate-400 block mb-1">کل بدهی معوقه</span>
                        <div class="text-xl font-black text-rose-600" id="stat-total-debt">۰ تومان</div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <span class="text-xs font-bold text-slate-400 block mb-1">مجموع حقوق و هزینه‌ها</span>
                        <div class="text-xl font-black text-amber-600" id="stat-total-expenses">۰ تومان</div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <span class="text-xs font-bold text-slate-400 block mb-1">سود خالص کل</span>
                        <div class="text-xl font-black text-blue-600" id="stat-net-income">۰ تومان</div>
                    </div>
                </div>

                <!-- جدول خلاصه‌ها -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 class="font-bold text-slate-800 mb-4">آخرین زبان‌آموزان ثبت‌نام شده</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-sm">
                            <thead class="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                                <tr>
                                    <th class="p-3">نام و نام خانوادگی</th>
                                    <th class="p-3">سطح</th>
                                    <th class="p-3">نوع کلاس</th>
                                    <th class="p-3">مبلغ پرداختی</th>
                                    <th class="p-3">بدهی</th>
                                    <th class="p-3">وضعیت</th>
                                </tr>
                            </thead>
                            <tbody id="overview-students-body" class="divide-y divide-slate-100">
                                <tr><td colspan="6" class="p-4 text-center text-slate-400">در حال لود اطلاعات...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- بخش ۲: ثبت‌نام زبان‌آموزان (Registration Section) -->
            <section id="section-registration" class="tab-content hidden space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <input type="text" id="student-search" oninput="filterStudents()" placeholder="🔍 جستجوی زبان‌آموز بر اساس نام یا شماره تلفن..."
                           class="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:bg-white focus:border-blue-500">
                    <button onclick="openStudentModal()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-2">
                        ➕ ثبت زبان‌آموز جدید
                    </button>
                </div>

                <!-- جدول زبان‌آموزان -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-sm">
                            <thead class="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                                <tr>
                                    <th class="p-4">نام و نام خانوادگی</th>
                                    <th class="p-4">سطح آموزشی</th>
                                    <th class="p-4">تلفن</th>
                                    <th class="p-4">نوع کلاس</th>
                                    <th class="p-4">شهریه کل</th>
                                    <th class="p-4">پرداختی</th>
                                    <th class="p-4">بدهی</th>
                                    <th class="p-4">وضعیت</th>
                                    <th class="p-4 text-center">عملیات</th>
                                </tr>
                            </thead>
                            <tbody id="students-table-body" class="divide-y divide-slate-100">
                                <!-- سطرها خودکار پر می‌شوند -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- بخش ۳: حقوق و دستمزد (Payroll Section) -->
            <section id="section-payroll" class="tab-content hidden space-y-6">
                <div class="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-800 text-sm">لیست حقوق پرداختی اساتید و پرسنل</h3>
                    <button onclick="openSalaryModal()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-emerald-500/20">
                        ➕ ثبت پرداخت جدید
                    </button>
                </div>

                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table class="w-full text-right text-sm">
                        <thead class="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                            <tr>
                                <th class="p-4">نام استاد / پرسنل</th>
                                <th class="p-4">بابت ماه</th>
                                <th class="p-4">مبلغ (تومان)</th>
                                <th class="p-4">وضعیت</th>
                                <th class="p-4 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody id="salaries-table-body" class="divide-y divide-slate-100">
                            <!-- سطرها خودکار پر می‌شوند -->
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- بخش ۴: هزینه‌های جاری (Expenses Section) -->
            <section id="section-expenses" class="tab-content hidden space-y-6">
                <div class="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-800 text-sm">لیست هزینه‌های جاری آموزشگاه</h3>
                    <button onclick="openExpenseModal()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-amber-500/20">
                        ➕ ثبت هزینه جدید
                    </button>
                </div>

                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table class="w-full text-right text-sm">
                        <thead class="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                            <tr>
                                <th class="p-4">عنوان هزینه</th>
                                <th class="p-4">دسته‌بندی</th>
                                <th class="p-4">مبلغ (تومان)</th>
                                <th class="p-4">تاریخ</th>
                                <th class="p-4 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody id="expenses-table-body" class="divide-y divide-slate-100">
                            <!-- سطرها خودکار پر می‌شوند -->
                        </tbody>
                    </table>
                </div>
            </section>

        </main>
    </div>

    <!-- ========================================== -->
    <!-- مودال ثبت زبان‌آموز جدید                  -->
    <!-- ========================================== -->
    <div id="student-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 class="text-lg font-black text-slate-800 mb-4">ثبت‌نام زبان‌آموز جدید</h3>
            <form id="student-form" onsubmit="saveStudent(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">نام</label>
                        <input type="text" id="st-firstName" required class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">نام خانوادگی</label>
                        <input type="text" id="st-lastName" required class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">سطح تحصیلی</label>
                        <select id="st-level" class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                            <option value="A1">A1 - Elementary</option>
                            <option value="A2">A2 - Pre-Intermediate</option>
                            <option value="B1">B1 - Intermediate</option>
                            <option value="B2">B2 - Upper-Intermediate</option>
                            <option value="C1">C1 - Advanced</option>
                            <option value="آلمانی A1">آلمانی A1</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">نوع کلاس</label>
                        <select id="st-classType" class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                            <option value="حضوری">حضوری</option>
                            <option value="آنلاین">آنلاین</option>
                            <option value="منتورینگ">منتورینگ</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">شماره تماس</label>
                        <input type="text" id="st-phone" placeholder="09123456789" class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">ترم تحصیلی</label>
                        <select id="st-termId" required class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">شهریه کل (تومان)</label>
                        <input type="number" id="st-totalPayable" required oninput="calcDebt()" class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">مبلغ پرداختی (تومان)</label>
                        <input type="number" id="st-amountPaid" value="0" oninput="calcDebt()" class="w-full p-2.5 rounded-xl border border-slate-200 text-sm">
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-4">
                    <button type="button" onclick="closeModal('student-modal')" class="px-4 py-2 text-slate-500 text-sm font-bold">انصراف</button>
                    <button type="submit" class="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl">ذخیره زبان‌آموز</button>
                </div>
            </form>
        </div>
    </div>

    <!-- اسکریپت فرانت‌اند PHP (Vanilla JS Client) -->
    <script>
        let allStudents = [];
        let allTerms = [];
        let allSalaries = [];
        let allExpenses = [];

        // لود اولیه اطلاعات از API PHP
        async function loadData() {
            try {
                const [terms, students, salaries, expenses] = await Promise.all([
                    fetch('api.php?action=terms').then(r => r.json()),
                    fetch('api.php?action=students').then(r => r.json()),
                    fetch('api.php?action=salaries').then(r => r.json()),
                    fetch('api.php?action=expenses').then(r => r.json())
                ]);

                allTerms = terms;
                allStudents = students;
                allSalaries = salaries;
                allExpenses = expenses;

                populateTerms();
                renderOverview();
                renderStudents();
                renderSalaries();
                renderExpenses();
            } catch (e) {
                console.error("Error loading PHP API data:", e);
            }
        }

        function populateTerms() {
            const select = document.getElementById('term-select');
            const stTermSelect = document.getElementById('st-termId');
            select.innerHTML = '<option value="all">همه ترم‌ها</option>';
            stTermSelect.innerHTML = '';

            allTerms.forEach(t => {
                select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                stTermSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
            });
        }

        function renderOverview() {
            const selectedTerm = document.getElementById('term-select').value;
            const filteredSt = selectedTerm === 'all' ? allStudents : allStudents.filter(s => s.termId === selectedTerm);
            const filteredSal = selectedTerm === 'all' ? allSalaries : allSalaries.filter(s => s.termId === selectedTerm);
            const filteredExp = selectedTerm === 'all' ? allExpenses : allExpenses.filter(e => e.termId === selectedTerm);

            const totalPaid = filteredSt.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
            const totalDebt = filteredSt.reduce((sum, s) => sum + (Number(s.debt) || 0), 0);
            const totalSal = filteredSal.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const totalExp = filteredExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const netIncome = totalPaid - (totalSal + totalExp);

            document.getElementById('stat-total-paid').innerText = totalPaid.toLocaleString('fa-IR') + ' تومان';
            document.getElementById('stat-total-debt').innerText = totalDebt.toLocaleString('fa-IR') + ' تومان';
            document.getElementById('stat-total-expenses').innerText = (totalSal + totalExp).toLocaleString('fa-IR') + ' تومان';
            document.getElementById('stat-net-income').innerText = netIncome.toLocaleString('fa-IR') + ' تومان';

            const tbody = document.getElementById('overview-students-body');
            tbody.innerHTML = filteredSt.slice(0, 5).map(s => `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-bold">${s.firstName} ${s.lastName}</td>
                    <td class="p-3">${s.level}</td>
                    <td class="p-3">${s.classType || 'حضوری'}</td>
                    <td class="p-3 text-emerald-600 font-bold">${Number(s.amountPaid).toLocaleString('fa-IR')}</td>
                    <td class="p-3 text-rose-600 font-bold">${Number(s.debt).toLocaleString('fa-IR')}</td>
                    <td class="p-3"><span class="px-2 py-1 rounded-lg text-xs font-bold ${s.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${s.status === 'paid' ? 'تسویه' : 'بدهکار'}</span></td>
                </tr>
            `).join('') || '<tr><td colspan="6" class="p-4 text-center text-slate-400">هیچ برنامه‌ای یافت نشد.</td></tr>';
        }

        function renderStudents() {
            const tbody = document.getElementById('students-table-body');
            tbody.innerHTML = allStudents.map(s => `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="p-4 font-bold text-slate-800">${s.firstName} ${s.lastName}</td>
                    <td class="p-4 text-slate-600">${s.level}</td>
                    <td class="p-4 text-slate-500">${s.phone || '-'}</td>
                    <td class="p-4 text-slate-600">${s.classType || 'حضوری'}</td>
                    <td class="p-4 font-bold">${Number(s.totalPayable).toLocaleString('fa-IR')}</td>
                    <td class="p-4 text-emerald-600 font-bold">${Number(s.amountPaid).toLocaleString('fa-IR')}</td>
                    <td class="p-4 text-rose-600 font-bold">${Number(s.debt).toLocaleString('fa-IR')}</td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 rounded-xl text-xs font-bold ${s.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                            ${s.status === 'paid' ? 'تسویه کامل' : 'بدهکار'}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <button onclick="deleteStudent('${s.id}')" class="text-rose-500 hover:text-rose-700 font-bold text-xs p-1">حذف 🗑️</button>
                    </td>
                </tr>
            `).join('');
        }

        function renderSalaries() {
            const tbody = document.getElementById('salaries-table-body');
            tbody.innerHTML = allSalaries.map(s => `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="p-4 font-bold">${s.teacherName}</td>
                    <td class="p-4 text-slate-600">${s.month}</td>
                    <td class="p-4 font-bold text-amber-600">${Number(s.amount).toLocaleString('fa-IR')}</td>
                    <td class="p-4"><span class="px-2.5 py-1 rounded-xl text-xs font-bold ${s.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${s.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}</span></td>
                    <td class="p-4 text-center"><button onclick="deleteSalary('${s.id}')" class="text-rose-500 hover:text-rose-700 text-xs font-bold">حذف</button></td>
                </tr>
            `).join('');
        }

        function renderExpenses() {
            const tbody = document.getElementById('expenses-table-body');
            tbody.innerHTML = allExpenses.map(e => `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="p-4 font-bold">${e.title}</td>
                    <td class="p-4 text-slate-500">${e.category}</td>
                    <td class="p-4 font-bold text-rose-600">${Number(e.amount).toLocaleString('fa-IR')}</td>
                    <td class="p-4 text-slate-500">${e.date}</td>
                    <td class="p-4 text-center"><button onclick="deleteExpense('${e.id}')" class="text-rose-500 hover:text-rose-700 text-xs font-bold">حذف</button></td>
                </tr>
            `).join('');
        }

        function switchTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('bg-blue-600', 'text-white'));
            
            document.getElementById('section-' + tab).classList.remove('hidden');
            document.getElementById('tab-' + tab).classList.add('bg-blue-600', 'text-white');
        }

        function openStudentModal() { document.getElementById('student-modal').classList.remove('hidden'); }
        function closeModal(id) { document.getElementById('student-modal').classList.add('hidden'); }

        async function saveStudent(e) {
            e.preventDefault();
            const total = Number(document.getElementById('st-totalPayable').value);
            const paid = Number(document.getElementById('st-amountPaid').value);
            const debt = total - paid;

            const payload = {
                firstName: document.getElementById('st-firstName').value,
                lastName: document.getElementById('st-lastName').value,
                level: document.getElementById('st-level').value,
                classType: document.getElementById('st-classType').value,
                phone: document.getElementById('st-phone').value,
                termId: document.getElementById('st-termId').value,
                totalPayable: total,
                amountPaid: paid,
                debt: debt,
                status: debt <= 0 ? 'paid' : 'unpaid'
            };

            await fetch('api.php?action=students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            closeModal('student-modal');
            loadData();
        }

        async function deleteStudent(id) {
            if (confirm('آیا از حذف این زبان‌آموز مطمئن هستید؟')) {
                await fetch(`api.php?action=students&id=${id}`, { method: 'DELETE' });
                loadData();
            }
        }

        // اجرا در هنگام بالا آمدن صفحه
        window.onload = loadData;
    </script>
<?php endif; ?>

</body>
</html>
