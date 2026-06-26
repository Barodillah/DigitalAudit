<?php
require_once __DIR__ . '/config.php';

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401);
}

$token = substr($authHeader, 7);
$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT u.id, u.role, u.dealer_id, u.name 
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > NOW()
");
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user) {
    jsonError('Unauthorized', 401);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // If specific ID requested
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("
            SELECT a.*, d.name as dealer_name, u.name as auditor_name
            FROM audits a
            LEFT JOIN dealers d ON d.id = a.dealer_id
            LEFT JOIN users u ON u.id = a.auditor_id
            WHERE a.id = ?
        ");
        $stmt->execute([$_GET['id']]);
        $audit = $stmt->fetch();
        if (!$audit) jsonError('Audit tidak ditemukan', 404);
        jsonResponse(['success' => true, 'data' => $audit]);
    } else {
        // List audits
        $where = "1=1";
        $params = [];
        if ($user['role'] !== 'super_admin') {
            $where .= " AND a.dealer_id = ?";
            $params[] = $user['dealer_id'];
        }
        
        $stmt = $pdo->prepare("
            SELECT a.id, a.title, a.status, a.audit_date, a.created_at, 
                   u.name as auditor_name,
                   (
                      SELECT COUNT(*) FROM audit_items i
                      JOIN audit_categories c ON c.id = i.category_id
                      WHERE c.template_id = a.template_id
                   ) as total_items
            FROM audits a
            LEFT JOIN users u ON u.id = a.auditor_id
            WHERE $where
            ORDER BY a.created_at DESC
        ");
        $stmt->execute($params);
        $audits = $stmt->fetchAll();
        
        // Mock progress calculation for now since we haven't implemented responses
        foreach ($audits as &$a) {
            $a['progress'] = 0; // default 0
        }
        
        jsonResponse(['success' => true, 'data' => $audits]);
    }
}
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['title']) || empty($input['template_id'])) {
        jsonError('Judul dan template wajib diisi', 422);
    }
    
    if (empty($user['dealer_id'])) {
        jsonError('Akun Anda tidak terikat dengan dealer manapun', 403);
    }

    try {
        $pdo->beginTransaction();
        
        $template_id = $input['template_id'];
        
        // Create custom template if "Buat dari kosong"
        if ($template_id === 'none') {
            $stmt = $pdo->prepare("INSERT INTO audit_templates (name, description, created_by) VALUES (?, ?, ?)");
            $stmt->execute([
                "Custom: " . $input['title'],
                "Template custom untuk audit " . $input['title'],
                $user['id']
            ]);
            $template_id = $pdo->lastInsertId();
        }
        
        // Buat audit header
        $stmt = $pdo->prepare("
            INSERT INTO audits (dealer_id, template_id, title, audit_date, status, auditor_id)
            VALUES (?, ?, ?, CURDATE(), 'draft', ?)
        ");
        $stmt->execute([
            $user['dealer_id'],
            $template_id,
            $input['title'],
            $user['id']
        ]);
        
        $audit_id = $pdo->lastInsertId();
        $pdo->commit();
        
        jsonResponse([
            'success' => true, 
            'message' => 'Audit berhasil dibuat',
            'data' => ['id' => $audit_id]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Gagal membuat audit: ' . $e->getMessage(), 500);
    }
}
elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['id'])) jsonError('Audit ID wajib diisi', 400);

    $audit_id = $input['id'];
    $updates = [];
    $params = [];

    if (isset($input['status'])) {
        $updates[] = "status = ?";
        $params[] = $input['status'];
    }

    if (empty($updates)) {
        jsonError('Tidak ada data yang diupdate', 400);
    }

    $params[] = $audit_id;

    try {
        $setSql = implode(', ', $updates);
        $stmt = $pdo->prepare("UPDATE audits SET $setSql WHERE id = ?");
        $stmt->execute($params);

        jsonResponse(['success' => true, 'message' => 'Status audit berhasil diupdate']);
    } catch (Exception $e) {
        jsonError('Gagal update audit: ' . $e->getMessage(), 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
