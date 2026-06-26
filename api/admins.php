<?php
/**
 * Admins API Endpoint
 * GET, POST, PUT
 * Hanya untuk super_admin
 */

require_once __DIR__ . '/config.php';

// Cek autentikasi (harus super_admin)
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401, 'UNAUTHORIZED');
}

$token = substr($authHeader, 7);
$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT u.role 
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > NOW()
");
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user || $user['role'] !== 'super_admin') {
    jsonError('Forbidden: Hanya Super Admin yang dapat mengakses resource ini', 403, 'FORBIDDEN');
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT u.id, u.name, u.email, u.role, u.dealer_id, d.name AS dealer_name 
        FROM users u 
        LEFT JOIN dealers d ON d.id = u.dealer_id 
        WHERE u.role = 'admin' 
        ORDER BY u.name ASC
    ");
    $admins = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $admins]);
} 
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['name']) || empty($input['email']) || empty($input['password']) || empty($input['dealer_id'])) {
        jsonError('Nama, Email, Password, dan Dealer wajib diisi', 422);
    }
    
    $hash = password_hash($input['password'], PASSWORD_BCRYPT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, dealer_id) VALUES (?, ?, ?, 'admin', ?)");
        $stmt->execute([
            $input['name'],
            $input['email'],
            $hash,
            $input['dealer_id']
        ]);
        
        jsonResponse(['success' => true, 'message' => 'Admin berhasil ditambahkan', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Duplicate entry
            jsonError('Email sudah digunakan', 409);
        }
        jsonError('Gagal menyimpan admin: ' . $e->getMessage(), 500);
    }
}
elseif ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id || empty($input['name']) || empty($input['email']) || empty($input['dealer_id'])) {
        jsonError('ID, Nama, Email, dan Dealer wajib diisi', 422);
    }
    
    try {
        if (!empty($input['password'])) {
            $hash = password_hash($input['password'], PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, password = ?, dealer_id = ? WHERE id = ? AND role = 'admin'");
            $stmt->execute([$input['name'], $input['email'], $hash, $input['dealer_id'], $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, dealer_id = ? WHERE id = ? AND role = 'admin'");
            $stmt->execute([$input['name'], $input['email'], $input['dealer_id'], $id]);
        }
        
        jsonResponse(['success' => true, 'message' => 'Admin berhasil diupdate']);
    } catch (PDOException $e) {
         if ($e->getCode() == 23000) { 
            jsonError('Email sudah digunakan', 409);
        }
        jsonError('Gagal mengupdate admin', 500);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonError('ID wajib diisi', 422);
    
    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ? AND role = 'admin'");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Admin berhasil dihapus']);
    } catch (PDOException $e) {
        jsonError('Gagal menghapus admin', 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
