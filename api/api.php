<?php
/**
 * Ghazal Academy accounting API
 * Maps REST paths like /api/students/12 onto action + id.
 */
require_once __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJson(['status' => 'ok']);
}

$pdo = getDbConnection();

$action = (string) ($_GET['action'] ?? '');
$id = $_GET['id'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

$path = trim($action, '/');
$parts = $path === '' ? [] : explode('/', $path);

if (count($parts) >= 2 && ($parts[1] ?? '') === 'batch') {
    $action = $parts[0] . '_batch';
    $id = null;
} elseif (count($parts) === 3 && ($parts[2] ?? '') === 'status') {
    $action = $parts[0] . '_status';
    $id = $parts[1];
} elseif (count($parts) === 3 && ($parts[2] ?? '') === 'receipt') {
    $action = $parts[0] . '_receipt';
    $id = $parts[1];
} elseif (count($parts) === 2) {
    $action = $parts[0];
    $id = $parts[1];
} elseif (count($parts) === 1) {
    $action = $parts[0];
}

$publicActions = ['health', 'login'];
if (!in_array($action, $publicActions, true)) {
    if (empty($_SESSION['user'])) {
        sendJson(['error' => 'برای این عملیات باید وارد شوید', 'code' => 'unauthorized'], 401);
    }
}

function mapId(array $rows): array
{
    return array_map(static function ($row) {
        if (isset($row['id'])) {
            $row['_id'] = (string) $row['id'];
            $row['id'] = (string) $row['id'];
        }
        foreach (['hasBook', 'hasInterview', 'hasDiscount', 'hasReceipt'] as $flag) {
            if (array_key_exists($flag, $row)) {
                $row[$flag] = (bool) ((int) $row[$flag]);
            }
        }
        foreach (['totalPayable', 'amountPaid', 'debt', 'bookPrice', 'discountPercent', 'discountAmount', 'fee', 'amount', 'paidAmount'] as $num) {
            if (array_key_exists($num, $row) && $row[$num] !== null) {
                $row[$num] = (int) $row[$num];
            }
        }
        return $row;
    }, $rows);
}

function currentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

function requireRole(array $roles): void
{
    $user = currentUser();
    if (!$user || !in_array($user['role'] ?? '', $roles, true)) {
        sendJson(['error' => 'دسترسی کافی ندارید'], 403);
    }
}

switch ($action) {
    case 'health':
        sendJson([
            'status' => 'ok',
            'database' => 'mysql',
            'php_version' => PHP_VERSION,
        ]);
        break;

    case 'login':
        if ($method !== 'POST') {
            sendJson(['error' => 'Method Not Allowed'], 405);
        }
        $input = getJsonInput();
        $username = trim((string) ($input['username'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if ($username === '' || $password === '') {
            sendJson(['success' => false, 'message' => 'نام کاربری و رمز عبور را وارد کنید'], 400);
        }

        $stmt = $pdo->prepare('SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        $ok = false;
        if ($user) {
            $stored = (string) $user['password'];
            $ok = hash_equals($stored, $password) || password_verify($password, $stored);
        }
        if (!$ok) {
            sendJson(['success' => false, 'message' => 'نام کاربری یا رمز عبور اشتباه است'], 401);
        }
        $safe = [
            'id' => (string) $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
        ];
        $_SESSION['user'] = $safe;
        sendJson(['success' => true, 'user' => $safe]);
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', $p['secure'], $p['httponly']);
        }
        session_destroy();
        sendJson(['success' => true]);
        break;

    case 'me':
        sendJson(['success' => true, 'user' => currentUser()]);
        break;

    case 'terms':
        if ($method === 'GET') {
            $stmt = $pdo->query('SELECT * FROM terms ORDER BY createdAt DESC, id DESC');
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            requireRole(['manager', 'reception']);
            $input = getJsonInput();
            $name = trim((string) ($input['name'] ?? ''));
            if ($name === '') {
                sendJson(['error' => 'نام ترم الزامی است'], 400);
            }
            $status = ($input['status'] ?? 'active') === 'completed' ? 'completed' : 'active';
            $createdAt = $input['createdAt'] ?? (int) round(microtime(true) * 1000);
            $stmt = $pdo->prepare('INSERT INTO terms (name, status, createdAt) VALUES (?, ?, ?)');
            $stmt->execute([$name, $status, $createdAt]);
            $insertId = (string) $pdo->lastInsertId();
            sendJson(['_id' => $insertId, 'id' => $insertId, 'name' => $name, 'status' => $status, 'createdAt' => $createdAt]);
        } elseif ($method === 'PATCH') {
            requireRole(['manager', 'reception']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $input = getJsonInput();
            $stmt = $pdo->prepare('UPDATE terms SET name = COALESCE(?, name), status = COALESCE(?, status) WHERE id = ?');
            $stmt->execute([$input['name'] ?? null, $input['status'] ?? null, $id]);
            sendJson(['success' => true]);
        } elseif ($method === 'DELETE') {
            requireRole(['manager', 'reception']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $sCheck = $pdo->prepare('SELECT COUNT(*) FROM students WHERE termId = ?');
            $sCheck->execute([$id]);
            if ((int) $sCheck->fetchColumn() > 0) {
                sendJson(['error' => 'امکان حذف ترم دارای زبان‌آموز وجود ندارد'], 400);
            }
            $salCheck = $pdo->prepare('SELECT COUNT(*) FROM salaries WHERE termId = ?');
            $salCheck->execute([$id]);
            if ((int) $salCheck->fetchColumn() > 0) {
                sendJson(['error' => 'امکان حذف ترم دارای سوابق حقوقی وجود ندارد'], 400);
            }
            $expCheck = $pdo->prepare('SELECT COUNT(*) FROM expenses WHERE termId = ?');
            $expCheck->execute([$id]);
            if ((int) $expCheck->fetchColumn() > 0) {
                sendJson(['error' => 'امکان حذف ترم دارای هزینه‌ها وجود ندارد'], 400);
            }
            $stmt = $pdo->prepare('DELETE FROM terms WHERE id = ?');
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        } else {
            sendJson(['error' => 'Method Not Allowed'], 405);
        }
        break;

    case 'students':
        if ($method === 'GET') {
            if ($id) {
                $stmt = $pdo->prepare('SELECT * FROM students WHERE id = ?');
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                if (!$row) {
                    sendJson(['error' => 'دانشجو پیدا نشد'], 404);
                }
                $row['hasReceipt'] = !empty($row['receiptUrl']);
                sendJson(mapId([$row])[0]);
            }
            $termId = $_GET['termId'] ?? null;
            $sql = 'SELECT id, termId, firstName, lastName, level, phone, classType,
                           totalPayable, amountPaid, debt, status, createdAt,
                           hasBook, bookName, bookPrice, hasInterview, hasDiscount,
                           discountPercent, discountAmount,
                           CASE WHEN receiptUrl IS NULL OR receiptUrl = "" THEN 0 ELSE 1 END AS hasReceipt
                    FROM students';
            $params = [];
            if ($termId) {
                $sql .= ' WHERE termId = ?';
                $params[] = $termId;
            }
            $sql .= ' ORDER BY id DESC';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            requireRole(['manager', 'reception']);
            $input = getJsonInput();
            $first = trim((string) ($input['firstName'] ?? ''));
            $last = trim((string) ($input['lastName'] ?? ''));
            if ($first === '' || $last === '') {
                sendJson(['error' => 'نام و نام خانوادگی الزامی است'], 400);
            }
            $total = (int) ($input['totalPayable'] ?? 0);
            $paid = (int) ($input['amountPaid'] ?? 0);
            $debt = $total - $paid;
            $status = $debt <= 0 ? 'paid' : 'unpaid';
            $stmt = $pdo->prepare('INSERT INTO students
                (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl,
                 hasBook, bookName, bookPrice, hasInterview, hasDiscount, discountPercent, discountAmount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $first,
                $last,
                (string) ($input['level'] ?? ''),
                $input['phone'] ?? null,
                $input['classType'] ?? 'حضوری',
                $total,
                $paid,
                $debt,
                $status,
                (string) ($input['termId'] ?? ''),
                $input['receiptUrl'] ?? null,
                !empty($input['hasBook']) ? 1 : 0,
                $input['bookName'] ?? null,
                (int) ($input['bookPrice'] ?? 0),
                !empty($input['hasInterview']) ? 1 : 0,
                !empty($input['hasDiscount']) ? 1 : 0,
                (int) ($input['discountPercent'] ?? 0),
                (int) ($input['discountAmount'] ?? 0),
            ]);
            $insertId = (string) $pdo->lastInsertId();
            sendJson([
                '_id' => $insertId,
                'id' => $insertId,
                'firstName' => $first,
                'lastName' => $last,
                'level' => $input['level'] ?? '',
                'phone' => $input['phone'] ?? null,
                'classType' => $input['classType'] ?? 'حضوری',
                'totalPayable' => $total,
                'amountPaid' => $paid,
                'debt' => $debt,
                'status' => $status,
                'termId' => (string) ($input['termId'] ?? ''),
                'hasBook' => !empty($input['hasBook']),
                'bookName' => $input['bookName'] ?? null,
                'bookPrice' => (int) ($input['bookPrice'] ?? 0),
                'hasInterview' => !empty($input['hasInterview']),
                'hasDiscount' => !empty($input['hasDiscount']),
                'discountPercent' => (int) ($input['discountPercent'] ?? 0),
                'discountAmount' => (int) ($input['discountAmount'] ?? 0),
                'hasReceipt' => !empty($input['receiptUrl']),
            ]);
        } elseif ($method === 'PATCH') {
            requireRole(['manager', 'reception']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $stmtSelect = $pdo->prepare('SELECT * FROM students WHERE id = ?');
            $stmtSelect->execute([$id]);
            $student = $stmtSelect->fetch();
            if (!$student) {
                sendJson(['error' => 'دانشجو پیدا نشد'], 404);
            }
            $input = getJsonInput();
            $totalPayable = isset($input['totalPayable']) ? (int) $input['totalPayable'] : (int) $student['totalPayable'];
            $amountPaid = isset($input['amountPaid']) ? (int) $input['amountPaid'] : (int) $student['amountPaid'];
            $debt = $totalPayable - $amountPaid;
            $status = $debt <= 0 ? 'paid' : 'unpaid';

            $stmt = $pdo->prepare('UPDATE students SET
                firstName = COALESCE(?, firstName),
                lastName = COALESCE(?, lastName),
                level = COALESCE(?, level),
                phone = COALESCE(?, phone),
                classType = COALESCE(?, classType),
                termId = COALESCE(?, termId),
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
                WHERE id = ?');
            $stmt->execute([
                isset($input['firstName']) ? trim((string) $input['firstName']) : null,
                isset($input['lastName']) ? trim((string) $input['lastName']) : null,
                $input['level'] ?? null,
                $input['phone'] ?? null,
                $input['classType'] ?? null,
                isset($input['termId']) ? (string) $input['termId'] : null,
                $amountPaid,
                $debt,
                $status,
                $totalPayable,
                isset($input['hasBook']) ? ($input['hasBook'] ? 1 : 0) : null,
                $input['bookName'] ?? null,
                isset($input['bookPrice']) ? (int) $input['bookPrice'] : null,
                isset($input['hasInterview']) ? ($input['hasInterview'] ? 1 : 0) : null,
                isset($input['hasDiscount']) ? ($input['hasDiscount'] ? 1 : 0) : null,
                isset($input['discountPercent']) ? (int) $input['discountPercent'] : null,
                isset($input['discountAmount']) ? (int) $input['discountAmount'] : null,
                $input['receiptUrl'] ?? null,
                $id,
            ]);
            sendJson(['success' => true, 'debt' => $debt, 'status' => $status, 'totalPayable' => $totalPayable, 'amountPaid' => $amountPaid]);
        } elseif ($method === 'DELETE') {
            requireRole(['manager', 'reception']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $pdo->prepare('DELETE FROM receipts WHERE studentId = ?')->execute([(string) $id]);
            $stmt = $pdo->prepare('DELETE FROM students WHERE id = ?');
            $stmt->execute([$id]);
            if ($stmt->rowCount() < 1) {
                sendJson(['error' => 'دانشجو پیدا نشد'], 404);
            }
            sendJson(['success' => true]);
        } else {
            sendJson(['error' => 'Method Not Allowed'], 405);
        }
        break;

    case 'students_receipt':
        if ($method !== 'GET' || !$id) {
            sendJson(['error' => 'Invalid Request'], 400);
        }
        $stmt = $pdo->prepare('SELECT receiptUrl FROM students WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJson(['error' => 'دانشجو پیدا نشد'], 404);
        }
        sendJson(['receiptUrl' => $row['receiptUrl'] ?: null]);
        break;

    case 'students_batch':
        requireRole(['manager', 'reception']);
        if ($method !== 'POST') {
            sendJson(['error' => 'Method Not Allowed'], 405);
        }
        $students = getJsonInput();
        if (!is_array($students)) {
            sendJson(['error' => 'Expected array'], 400);
        }
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl, hasBook, bookName, bookPrice, hasInterview, hasDiscount, discountPercent, discountAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($students as $s) {
                $total = (int) ($s['totalPayable'] ?? 0);
                $paid = (int) ($s['amountPaid'] ?? 0);
                $debt = $total - $paid;
                $stmt->execute([
                    $s['firstName'] ?? '',
                    $s['lastName'] ?? '',
                    $s['level'] ?? '',
                    $s['phone'] ?? null,
                    $s['classType'] ?? 'حضوری',
                    $total,
                    $paid,
                    $debt,
                    ($debt <= 0) ? 'paid' : ($s['status'] ?? 'unpaid'),
                    $s['termId'] ?? '',
                    $s['receiptUrl'] ?? null,
                    !empty($s['hasBook']) ? 1 : 0,
                    $s['bookName'] ?? null,
                    (int) ($s['bookPrice'] ?? 0),
                    !empty($s['hasInterview']) ? 1 : 0,
                    !empty($s['hasDiscount']) ? 1 : 0,
                    (int) ($s['discountPercent'] ?? 0),
                    (int) ($s['discountAmount'] ?? 0),
                ]);
            }
            $pdo->commit();
            sendJson(['success' => true, 'count' => count($students)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJson(['error' => $e->getMessage()], 500);
        }
        break;

    case 'students_status':
        requireRole(['manager', 'reception']);
        if ($method !== 'PATCH' || !$id) {
            sendJson(['error' => 'Invalid Request'], 400);
        }
        $input = getJsonInput();
        $status = ($input['status'] ?? 'paid') === 'unpaid' ? 'unpaid' : 'paid';
        if ($status === 'paid') {
            $stmt = $pdo->prepare('UPDATE students SET status = ?, amountPaid = totalPayable, debt = 0 WHERE id = ?');
            $stmt->execute([$status, $id]);
        } else {
            $stmt = $pdo->prepare('UPDATE students SET status = ? WHERE id = ?');
            $stmt->execute([$status, $id]);
        }
        sendJson(['success' => true]);
        break;

    case 'salaries':
        if ($method === 'GET') {
            $stmt = $pdo->query('SELECT * FROM salaries ORDER BY id DESC');
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            requireRole(['manager']);
            $input = getJsonInput();
            $stmt = $pdo->prepare('INSERT INTO salaries (teacherName, role, amount, month, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $input['teacherName'] ?? '',
                $input['role'] ?? 'استاد',
                (int) ($input['amount'] ?? 0),
                $input['month'] ?? '',
                $input['status'] ?? 'unpaid',
                $input['termId'] ?? '',
                $input['receiptUrl'] ?? null,
            ]);
            $insertId = (string) $pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'PATCH') {
            requireRole(['manager']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $input = getJsonInput();
            $stmt = $pdo->prepare('UPDATE salaries SET teacherName = COALESCE(?, teacherName), role = COALESCE(?, role), amount = COALESCE(?, amount), month = COALESCE(?, month), status = COALESCE(?, status), termId = COALESCE(?, termId), receiptUrl = COALESCE(?, receiptUrl) WHERE id = ?');
            $stmt->execute([
                $input['teacherName'] ?? null,
                $input['role'] ?? null,
                isset($input['amount']) ? (int) $input['amount'] : null,
                $input['month'] ?? null,
                $input['status'] ?? null,
                $input['termId'] ?? null,
                $input['receiptUrl'] ?? null,
                $id,
            ]);
            sendJson(['success' => true]);
        } elseif ($method === 'DELETE') {
            requireRole(['manager']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $stmt = $pdo->prepare('DELETE FROM salaries WHERE id = ?');
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    case 'salaries_batch':
        requireRole(['manager']);
        if ($method !== 'POST') {
            sendJson(['error' => 'Method Not Allowed'], 405);
        }
        $salariesInput = getJsonInput();
        if (!is_array($salariesInput)) {
            sendJson(['error' => 'Expected array'], 400);
        }
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO salaries (teacherName, role, amount, month, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($salariesInput as $sal) {
                $stmt->execute([
                    $sal['teacherName'] ?? '',
                    $sal['role'] ?? 'استاد',
                    (int) ($sal['amount'] ?? 0),
                    $sal['month'] ?? '',
                    $sal['status'] ?? 'unpaid',
                    $sal['termId'] ?? '',
                    $sal['receiptUrl'] ?? null,
                ]);
            }
            $pdo->commit();
            sendJson(['success' => true, 'count' => count($salariesInput)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJson(['error' => $e->getMessage()], 500);
        }
        break;

    case 'expenses':
        if ($method === 'GET') {
            $stmt = $pdo->query('SELECT * FROM expenses ORDER BY id DESC');
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            requireRole(['manager']);
            $input = getJsonInput();
            $stmt = $pdo->prepare('INSERT INTO expenses (title, amount, category, date, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $input['title'] ?? '',
                (int) ($input['amount'] ?? 0),
                $input['category'] ?? 'عمومی',
                $input['date'] ?? '',
                $input['termId'] ?? '',
                $input['receiptUrl'] ?? null,
            ]);
            $insertId = (string) $pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'PATCH') {
            requireRole(['manager']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $input = getJsonInput();
            $stmt = $pdo->prepare('UPDATE expenses SET title = COALESCE(?, title), amount = COALESCE(?, amount), category = COALESCE(?, category), date = COALESCE(?, date), termId = COALESCE(?, termId), receiptUrl = COALESCE(?, receiptUrl) WHERE id = ?');
            $stmt->execute([
                $input['title'] ?? null,
                isset($input['amount']) ? (int) $input['amount'] : null,
                $input['category'] ?? null,
                $input['date'] ?? null,
                $input['termId'] ?? null,
                $input['receiptUrl'] ?? null,
                $id,
            ]);
            sendJson(['success' => true]);
        } elseif ($method === 'DELETE') {
            requireRole(['manager']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $stmt = $pdo->prepare('DELETE FROM expenses WHERE id = ?');
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    case 'levels':
        if ($method === 'GET') {
            $stmt = $pdo->query('SELECT * FROM levels ORDER BY id ASC');
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            requireRole(['manager', 'reception']);
            $input = getJsonInput();
            $stmt = $pdo->prepare('INSERT INTO levels (name, fee) VALUES (?, ?)');
            $stmt->execute([$input['name'] ?? '', (int) ($input['fee'] ?? 0)]);
            $insertId = (string) $pdo->lastInsertId();
            $input['_id'] = $insertId;
            $input['id'] = $insertId;
            sendJson($input);
        } elseif ($method === 'DELETE') {
            requireRole(['manager', 'reception']);
            if (!$id) {
                sendJson(['error' => 'ID required'], 400);
            }
            $stmt = $pdo->prepare('DELETE FROM levels WHERE id = ?');
            $stmt->execute([$id]);
            sendJson(['success' => true]);
        }
        break;

    case 'levels_batch':
        requireRole(['manager', 'reception']);
        if ($method !== 'POST') {
            sendJson(['error' => 'Method Not Allowed'], 405);
        }
        $levelsInput = getJsonInput();
        if (!is_array($levelsInput)) {
            sendJson(['error' => 'Expected array'], 400);
        }
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO levels (name, fee) VALUES (?, ?)');
            foreach ($levelsInput as $lv) {
                $stmt->execute([$lv['name'] ?? '', (int) ($lv['fee'] ?? 0)]);
            }
            $pdo->commit();
            sendJson(['success' => true, 'count' => count($levelsInput)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJson(['error' => $e->getMessage()], 500);
        }
        break;

    case 'receipts':
        if ($method === 'GET') {
            $studentId = $_GET['studentId'] ?? $id;
            if ($studentId) {
                $stmt = $pdo->prepare('SELECT * FROM receipts WHERE studentId = ? ORDER BY id DESC');
                $stmt->execute([$studentId]);
            } else {
                $stmt = $pdo->query('SELECT * FROM receipts ORDER BY id DESC');
            }
            sendJson(mapId($stmt->fetchAll()));
        } elseif ($method === 'POST') {
            requireRole(['manager', 'reception']);
            $input = getJsonInput();
            $stmt = $pdo->prepare('INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)');
            $stmt->execute([
                $input['studentId'] ?? '',
                $input['termId'] ?? '',
                (int) ($input['paidAmount'] ?? 0),
                $input['date'] ?? '',
            ]);
            sendJson(['success' => true, 'id' => (string) $pdo->lastInsertId()]);
        }
        break;

    default:
        sendJson(['error' => 'Invalid action endpoint', 'action' => $action], 404);
}
