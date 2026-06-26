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
if (!$user) jsonError('Unauthorized', 401);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $uuid = $_GET['uuid'] ?? null;
    if (!$uuid) jsonError('UUID diperlukan', 400);

    $stmt = $pdo->prepare("
        SELECT al.expired_at, a.id as audit_id, a.title as audit_title, u.name as reviewer_name 
        FROM audit_links al
        JOIN audits a ON a.id = al.audit_id
        JOIN users u ON u.id = a.reviewer_id
        WHERE al.uuid = ? AND al.status = 'active'
    ");
    $stmt->execute([$uuid]);
    $data = $stmt->fetch();

    if (!$data) {
        jsonError('Link tidak valid atau sudah tidak aktif', 404);
    }

    if (strtotime($data['expired_at']) < time()) {
        jsonError('Link kedaluwarsa', 403);
    }

    jsonResponse(['success' => true, 'data' => $data]);
} else {
    jsonError('Method not allowed', 405);
}
