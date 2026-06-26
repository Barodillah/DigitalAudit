<?php
/**
 * Staff API Endpoint
 * GET, POST, PUT, DELETE
 * Untuk super_admin dan admin
 */

require_once __DIR__ . '/config.php';

// Cek autentikasi
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401, 'UNAUTHORIZED');
}

$token = substr($authHeader, 7);
$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT u.id, u.role, u.dealer_id 
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > NOW()
");
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user || !in_array($user['role'], ['super_admin', 'admin'])) {
    jsonError('Forbidden', 403, 'FORBIDDEN');
}

$method = $_SERVER['REQUEST_METHOD'];
$isAdmin = $user['role'] === 'admin';
$myDealerId = $user['dealer_id'];

if ($method === 'GET') {
    if ($isAdmin) {
        $stmt = $pdo->prepare("
            SELECT u.id, u.name, u.email, u.role, u.dealer_id, d.name AS dealer_name 
            FROM users u 
            LEFT JOIN dealers d ON d.id = u.dealer_id 
            WHERE u.role IN ('staff', 'reviewer') AND u.dealer_id = ?
            ORDER BY u.name ASC
        ");
        $stmt->execute([$myDealerId]);
    } else {
        $stmt = $pdo->query("
            SELECT u.id, u.name, u.email, u.role, u.dealer_id, d.name AS dealer_name 
            FROM users u 
            LEFT JOIN dealers d ON d.id = u.dealer_id 
            WHERE u.role IN ('staff', 'reviewer')
            ORDER BY u.name ASC
        ");
    }
    
    $staff = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $staff]);
} 
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['name']) || empty($input['email']) || empty($input['password']) || empty($input['role'])) {
        jsonError('Semua field wajib diisi', 422);
    }
    
    if (!in_array($input['role'], ['staff', 'reviewer'])) {
        jsonError('Role tidak valid', 422);
    }
    
    $dealer_id = $isAdmin ? $myDealerId : $input['dealer_id'];
    if (empty($dealer_id)) {
        jsonError('Dealer wajib diisi', 422);
    }
    
    $hash = password_hash($input['password'], PASSWORD_BCRYPT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, dealer_id) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['name'],
            $input['email'],
            $hash,
            $input['role'],
            $dealer_id
        ]);
        
        jsonResponse(['success' => true, 'message' => 'Staff berhasil ditambahkan', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { 
            jsonError('Email sudah digunakan', 409);
        }
        jsonError('Gagal menyimpan staff: ' . $e->getMessage(), 500);
    }
}
elseif ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id || empty($input['name']) || empty($input['email']) || empty($input['role'])) {
        jsonError('ID, Nama, Email, dan Role wajib diisi', 422);
    }
    
    // Verifikasi dealer jika admin
    if ($isAdmin) {
        $check = $pdo->prepare("SELECT dealer_id FROM users WHERE id = ? AND role IN ('staff', 'reviewer')");
        $check->execute([$id]);
        $targetUser = $check->fetch();
        if (!$targetUser || $targetUser['dealer_id'] != $myDealerId) {
            jsonError('Tidak dapat mengedit user dari dealer lain', 403);
        }
    }
    
    $dealer_id = $isAdmin ? $myDealerId : $input['dealer_id'];
    
    try {
        if (!empty($input['password'])) {
            $hash = password_hash($input['password'], PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, dealer_id = ? WHERE id = ?");
            $stmt->execute([$input['name'], $input['email'], $hash, $input['role'], $dealer_id, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, role = ?, dealer_id = ? WHERE id = ?");
            $stmt->execute([$input['name'], $input['email'], $input['role'], $dealer_id, $id]);
        }
        
        jsonResponse(['success' => true, 'message' => 'Staff berhasil diupdate']);
    } catch (PDOException $e) {
         if ($e->getCode() == 23000) { 
            jsonError('Email sudah digunakan', 409);
        }
        jsonError('Gagal mengupdate staff', 500);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonError('ID wajib diisi', 422);
    
    if ($isAdmin) {
        $check = $pdo->prepare("SELECT dealer_id FROM users WHERE id = ?");
        $check->execute([$id]);
        $targetUser = $check->fetch();
        if (!$targetUser || $targetUser['dealer_id'] != $myDealerId) {
            jsonError('Tidak dapat menghapus user dari dealer lain', 403);
        }
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ? AND role IN ('staff', 'reviewer')");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Staff berhasil dihapus']);
    } catch (PDOException $e) {
        jsonError('Gagal menghapus staff', 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
