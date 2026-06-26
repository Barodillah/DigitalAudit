<?php
require_once __DIR__ . '/config.php';

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401);
}

$token = substr($authHeader, 7);
$pdo = getDB();

$stmt = $pdo->prepare("SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > NOW()");
$stmt->execute([$token]);
$user = $stmt->fetch();
if (!$user) {
    jsonError('Unauthorized', 401);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $audit_id = $_GET['audit_id'] ?? null;
    if (!$audit_id) {
        jsonError('Audit ID diperlukan', 400);
    }

    // Update status to expired for links that passed their expiration time before returning
    $stmt = $pdo->prepare("UPDATE audit_links SET status = 'expired' WHERE audit_id = ? AND status = 'active' AND expired_at < NOW()");
    $stmt->execute([$audit_id]);

    $stmt = $pdo->prepare("SELECT id, uuid, pin, status, expired_at, created_at FROM audit_links WHERE audit_id = ? ORDER BY created_at DESC");
    $stmt->execute([$audit_id]);
    $links = $stmt->fetchAll();

    jsonResponse(['success' => true, 'data' => $links]);
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $audit_id = $input['audit_id'] ?? null;
    $reviewer_id = $input['reviewer_id'] ?? null;
    $duration_days = (int)($input['duration_days'] ?? 1);

    if (!$audit_id || !$reviewer_id) {
        jsonError('Audit ID dan Reviewer ID diperlukan', 400);
    }

    try {
        $pdo->beginTransaction();

        // Update audits table with reviewer_id
        $stmt = $pdo->prepare("UPDATE audits SET reviewer_id = ? WHERE id = ?");
        $stmt->execute([$reviewer_id, $audit_id]);

        // Generate UUID and PIN
        $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        $pin = sprintf("%06d", mt_rand(0, 999999));
        
        $expired_at = date('Y-m-d H:i:s', strtotime("+$duration_days days"));

        $stmt = $pdo->prepare("INSERT INTO audit_links (audit_id, uuid, pin, expired_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$audit_id, $uuid, $pin, $expired_at]);
        
        $link_id = $pdo->lastInsertId();

        $pdo->commit();

        jsonResponse([
            'success' => true, 
            'message' => 'Link berhasil dibuat',
            'data' => [
                'id' => $link_id,
                'uuid' => $uuid,
                'pin' => $pin,
                'expired_at' => $expired_at,
                'status' => 'active'
            ]
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Gagal membuat link: ' . $e->getMessage(), 500);
    }
} else {
    jsonError('Method not allowed', 405);
}
