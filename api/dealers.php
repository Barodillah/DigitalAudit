<?php
/**
 * Dealers API Endpoint
 * GET, POST, PUT
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
    $stmt = $pdo->query("SELECT id, code, name, address, is_active FROM dealers ORDER BY name ASC");
    $dealers = $stmt->fetchAll();
    
    // Konversi is_active ke boolean
    foreach ($dealers as &$d) {
        $d['is_active'] = (bool) $d['is_active'];
    }
    
    jsonResponse(['success' => true, 'data' => $dealers]);
} 
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['name']) || empty($input['code'])) {
        jsonError('Nama dan Kode wajib diisi', 422);
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO dealers (code, name, address, is_active) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $input['code'],
            $input['name'],
            $input['address'] ?? null,
            isset($input['is_active']) ? (int)$input['is_active'] : 1
        ]);
        
        jsonResponse(['success' => true, 'message' => 'Dealer berhasil ditambahkan', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Duplicate entry
            jsonError('Kode dealer sudah digunakan', 409);
        }
        jsonError('Gagal menyimpan dealer: ' . $e->getMessage(), 500);
    }
}
elseif ($method === 'PUT') {
    // Parsing ID dari URL jika ada, misal /api/dealers.php?id=1
    $id = $_GET['id'] ?? null;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id || empty($input['name']) || empty($input['code'])) {
        jsonError('ID, Nama, dan Kode wajib diisi', 422);
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE dealers SET code = ?, name = ?, address = ?, is_active = ? WHERE id = ?");
        $stmt->execute([
            $input['code'],
            $input['name'],
            $input['address'] ?? null,
            isset($input['is_active']) ? (int)$input['is_active'] : 1,
            $id
        ]);
        
        jsonResponse(['success' => true, 'message' => 'Dealer berhasil diupdate']);
    } catch (PDOException $e) {
         if ($e->getCode() == 23000) { 
            jsonError('Kode dealer sudah digunakan', 409);
        }
        jsonError('Gagal mengupdate dealer', 500);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonError('ID wajib diisi', 422);
    
    try {
        $stmt = $pdo->prepare("DELETE FROM dealers WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Dealer berhasil dihapus']);
    } catch (PDOException $e) {
        jsonError('Gagal menghapus dealer: kemungkinan data ini masih digunakan', 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
