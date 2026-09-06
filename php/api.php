<?php
/**
 * RESTful API Controller in PHP
 * Ghazal Language Academy Management System
 */

require_once __DIR__ . '/config.php';

// پشتیبانی از پاسخ پیش‌فرض OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJson(['status' => 'ok']);
}

$pdo = getDbConnection();

// تعیین اکشن بر اساس کوئری پارامتر action یا مسیر URL
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// دریافت پارامتر ID در صورت وجود
$id = $_GET['id'] ?? null;

// توابع کمکی تبدیل ID برای هماهنگی فرانت‌اند
function mapId($rows) {
    return array_map(function($row) {
        if (isset($row['id'])) {
            $row['_id'] = (string)$row['id'];
            $row['id'] = (string)$row['id'];
        }
        return $row;
    }, $rows);
}

// -------------------------------------------------------------
// اکشن‌ها
// -------------------------------------------------------------

switch ($action) {

    // 1. بررسي سلامت سرور
    case 'health':
        sendJson(['status' => 'ok', 'database' => 'mysql', 'php_version' => PHP_VERSION]);
        break;

    // 2. احراز هویت و لاگین
    case 'login':
        if ($method !== 'POST') sendJson(['error' => 'Method Not Allowed'], 405);
        $input = getJsonInput();
        $username = trim($input['username'] ?? '');
        $password = trim($input['password'] ?? '');

        $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?");
        $stmt->execute([$username, $password]);
        $user = $stmt->fetch();

        if ($user) {
            sendJson(['success' => true, 'user' => $user]);
        } else {
            sendJson(['success' => false, 'message' => 'نام کاربری یا رمز عبور اشتباه است'], 401);
        }
        break;

    // 3. مدیریت ترم‌ها
    case 'terms':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM terms ORDER BY createdAt DESC");
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $name = $input['name'] ?? '';
            $status = $input['status'] ?? 'active';
            $createdAt = $input['createdAt'] ?? (int)(microtime(true) * 1000);

            $stmt = $pdo->prepare("INSERT INTO terms (name, status, createdAt) VALUES (?, ?, ?)");
            $stmt->execute([$name, $status, $createdAt]);
            $insertId = (string)$pdo->lastInsertId();

            sendJson(['_id' => $insertId, 'id' => $insertId, 'name' => $name, 'status' => $status, 'createdAt' => $createdAt]);
        } elseif ($method === 'PATCH') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $input = getJsonInput();
            $name = $input['name'] ?? null;
            $status = $input['status'] ?? null;

            $stmt = $pdo->prepare("UPDATE terms SET name = COALESCE(?, name), status = COALESCE(?, status) WHERE id = ?");
            $stmt->execute([$name, $status, $id]);
            sendJson(['success' => true]);
        } elseif ($method === 'DELETE') {
            if (!$id) sendJson(['error' => 'ID required'], 400);

            // بررسی جابجایی یا استفاده ترم قبل حذف
            $sCheck = $pdo->prepare("SELECT COUNT(*) as cnt FROM students WHERE termId = ?");
            $sCheck->execute([$id]);
            if ($sCheck->fetch()['cnt'] > 0) {
                sendJson(['error' => 'امکان حذف ترم دارای زبان‌آموز وجود ندارد'], 400);
            }

            $salCheck = $pdo->prepare("SELECT COUNT(*) as cnt FROM salaries WHERE termId = ?");
            $salCheck->execute([$id]);
            if ($salCheck->fetch()['cnt'] > 0) {
                sendJson(['error' => 'امکان حذف ترم دارای سوابق حقوقی وجود ندارد'], 400);
            }

            $expCheck = $pdo->prepare("SELECT COUNT(*) as cnt FROM expenses WHERE termId = ?");
            $expCheck->execute([$id]);
            if ($expCheck->fetch()['cnt'] > 0) {
                sendJson(['error' => 'امکان حذف ترم دارای هزینه‌ها وجود ندارد'], 400);
            }

            $stmt = $pdo->prepare("DELETE FROM terms WHERE id = ?");
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    // 4. مدیریت زبان‌آموزان
    case 'students':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM students ORDER BY createdAt DESC");
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl, hasBook, bookName, bookPrice, hasInterview, hasDiscount, discountPercent, discountAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['firstName'] ?? '',
                $input['lastName'] ?? '',
                $input['level'] ?? '',
                $input['phone'] ?? null,
                $input['classType'] ?? 'حضوری',
                (int)($input['totalPayable'] ?? 0),
                (int)($input['amountPaid'] ?? 0),
                (int)($input['debt'] ?? 0),
                $input['status'] ?? 'unpaid',
                $input['termId'] ?? '',
                $input['receiptUrl'] ?? null,
                !empty($input['hasBook']) ? 1 : 0,
                $input['bookName'] ?? null,
                (int)($input['bookPrice'] ?? 0),
                !empty($input['hasInterview']) ? 1 : 0,
                !empty($input['hasDiscount']) ? 1 : 0,
                (int)($input['discountPercent'] ?? 0),
                (int)($input['discountAmount'] ?? 0)
            ]);
            $insertId = (string)$pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'PATCH') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $input = getJsonInput();

            $stmtSelect = $pdo->prepare("SELECT totalPayable FROM students WHERE id = ?");
            $stmtSelect->execute([$id]);
            $student = $stmtSelect->fetch();
            if (!$student) sendJson(['error' => 'Student not found'], 404);

            // اگر شهریه کل جدیدی از سمت کاربر آمد از آن استفاده کن، در غیر اینصورت شهریه قبلی
            $totalPayable = isset($input['totalPayable']) ? (int)$input['totalPayable'] : (int)$student['totalPayable'];
            $amountPaid = (int)($input['amountPaid'] ?? 0);
            $debt = $totalPayable - $amountPaid;
            $status = $debt <= 0 ? 'paid' : 'unpaid';
            $receiptUrl = $input['receiptUrl'] ?? null;

            $stmt = $pdo->prepare("UPDATE students SET 
                amountPaid = ?, 
                debt = ?, 
                status = ?, 
                totalPayable = ?,
                hasBook = COALESCE(?, hasBook),
                bookName = COALESCE(?, bookName),
                bookPrice = COALESCE(?, bookPrice),
                hasInterview = COALESCE(?, hasInterview),
                hasDiscount = COALESCE(?, hasDiscount),
                discountPercent = COALESCE(?, discountPercent),
                discountAmount = COALESCE(?, discountAmount),
                receiptUrl = COALESCE(?, receiptUrl) 
                WHERE id = ?");
                
            $stmt->execute([
                $amountPaid, 
                $debt, 
                $status, 
                $totalPayable,
                isset($input['hasBook']) ? ($input['hasBook'] ? 1 : 0) : null,
                $input['bookName'] ?? null,
                isset($input['bookPrice']) ? (int)$input['bookPrice'] : null,
                isset($input['hasInterview']) ? ($input['hasInterview'] ? 1 : 0) : null,
                isset($input['hasDiscount']) ? ($input['hasDiscount'] ? 1 : 0) : null,
                isset($input['discountPercent']) ? (int)$input['discountPercent'] : null,
                isset($input['discountAmount']) ? (int)$input['discountAmount'] : null,
                $receiptUrl, 
                $id
            ]);
            sendJson(['success' => true, 'debt' => $debt, 'status' => $status]);
        } elseif ($method === 'DELETE') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    // 5. افزودن دسته‌جمعی زبان‌آموزان
    case 'students_batch':
        if ($method !== 'POST') sendJson(['error' => 'Method Not Allowed'], 405);
        $students = getJsonInput();
        if (!is_array($students)) sendJson(['error' => 'Expected array'], 400);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($students as $s) {
                $stmt->execute([
                    $s['firstName'] ?? '',
                    $s['lastName'] ?? '',
                    $s['level'] ?? '',
                    $s['phone'] ?? null,
                    $s['classType'] ?? 'حضوری',
                    (int)($s['totalPayable'] ?? 0),
                    (int)($s['amountPaid'] ?? 0),
                    (int)($s['debt'] ?? 0),
                    $s['status'] ?? 'unpaid',
                    $s['termId'] ?? '',
                    $s['receiptUrl'] ?? null
                ]);
            }
            $pdo->commit();
            sendJson(['success' => true, 'count' => count($students)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJson(['error' => $e->getMessage()], 500);
        }
        break;

    // 6. تغییر وضعیت تسویه زبان‌آموز
    case 'students_status':
        if ($method !== 'PATCH' || !$id) sendJson(['error' => 'Invalid Request'], 400);
        $input = getJsonInput();
        $status = $input['status'] ?? 'paid';

        $stmt = $pdo->prepare("UPDATE students SET status = ?, amountPaid = totalPayable, debt = 0 WHERE id = ?");
        $stmt->execute([$status, $id]);
        sendJson(['success' => true]);
        break;

    // 7. حقوق و دستمزد اساتید
    case 'salaries':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM salaries ORDER BY createdAt DESC");
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO salaries (teacherName, amount, month, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['teacherName'] ?? '',
                (int)($input['amount'] ?? 0),
                $input['month'] ?? '',
                $input['status'] ?? 'unpaid',
                $input['termId'] ?? '',
                $input['receiptUrl'] ?? null
            ]);
            $insertId = (string)$pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'PATCH') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $input = getJsonInput();
            $stmt = $pdo->prepare("UPDATE salaries SET teacherName = COALESCE(?, teacherName), amount = COALESCE(?, amount), month = COALESCE(?, month), status = COALESCE(?, status), termId = COALESCE(?, termId), receiptUrl = COALESCE(?, receiptUrl) WHERE id = ?");
            $stmt->execute([
                $input['teacherName'] ?? null,
                isset($input['amount']) ? (int)$input['amount'] : null,
                $input['month'] ?? null,
                $input['status'] ?? null,
                $input['termId'] ?? null,
                $input['receiptUrl'] ?? null,
                $id
            ]);
            sendJson(['success' => true]);
        } elseif ($method === 'DELETE') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $stmt = $pdo->prepare("DELETE FROM salaries WHERE id = ?");
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    // 8. هزینه‌های جاری
    case 'expenses':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM expenses ORDER BY createdAt DESC");
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO expenses (title, amount, category, date, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['title'] ?? '',
                (int)($input['amount'] ?? 0),
                $input['category'] ?? 'عمومی',
                $input['date'] ?? '',
                $input['termId'] ?? '',
                $input['receiptUrl'] ?? null
            ]);
            $insertId = (string)$pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'PATCH') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $input = getJsonInput();
            $stmt = $pdo->prepare("UPDATE expenses SET title = COALESCE(?, title), amount = COALESCE(?, amount), category = COALESCE(?, category), date = COALESCE(?, date), termId = COALESCE(?, termId), receiptUrl = COALESCE(?, receiptUrl) WHERE id = ?");
            $stmt->execute([
                $input['title'] ?? null,
                isset($input['amount']) ? (int)$input['amount'] : null,
                $input['category'] ?? null,
                $input['date'] ?? null,
                $input['termId'] ?? null,
                $input['receiptUrl'] ?? null,
                $id
            ]);
            sendJson(['success' => true]);
        } elseif ($method === 'DELETE') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    // 9. سطوح تحصیلی
    case 'levels':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM levels");
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO levels (name, fee) VALUES (?, ?)");
            $stmt->execute([
                $input['name'] ?? '',
                (int)($input['fee'] ?? 0)
            ]);
            $insertId = (string)$pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'DELETE') {
            if (!$id) sendJson(['error' => 'ID required'], 400);
            $stmt = $pdo->prepare("DELETE FROM levels WHERE id = ?");
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    // 10. رسیدهای چاپی زبان‌آموزان
    case 'receipts':
        if ($method === 'GET') {
            // استفاده از $id که توسط URL Rewrite تولید شده است
            $studentId = $_GET['studentId'] ?? $id; 
            
            if ($studentId) {
                $stmt = $pdo->prepare("SELECT * FROM receipts WHERE studentId = ? ORDER BY createdAt DESC");
                $stmt->execute([$studentId]);
            } else {
                $stmt = $pdo->query("SELECT * FROM receipts ORDER BY createdAt DESC");
            }
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $input['studentId'] ?? '',
                $input['termId'] ?? '',
                (int)($input['paidAmount'] ?? 0),
                $input['date'] ?? ''
            ]);
            sendJson(['success' => true, 'id' => (string)$pdo->lastInsertId()]);
        }
        break;
    // 7.5 افزودن دسته‌جمعی حقوق و دستمزد (از طریق اکسل)
    case 'salaries_batch':
        if ($method !== 'POST') sendJson(['error' => 'Method Not Allowed'], 405);
        $salariesInput = getJsonInput();
        if (!is_array($salariesInput)) sendJson(['error' => 'Expected array'], 400);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO salaries (teacherName, role, amount, month, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($salariesInput as $sal) {
                $stmt->execute([
                    $sal['teacherName'] ?? '',
                    'استاد', // Role is hardcoded to 'استاد'
                    (int)($sal['amount'] ?? 0),
                    $sal['month'] ?? '',
                    $sal['status'] ?? 'unpaid',
                    $sal['termId'] ?? '',
                    $sal['receiptUrl'] ?? null
                ]);
            }
            $pdo->commit();
            sendJson(['success' => true, 'count' => count($salariesInput)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJson(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        sendJson(['error' => 'Invalid action endpoint'], 404);
        break;
}

