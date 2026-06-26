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
    $audit_id = $_GET['audit_id'] ?? null;
    $item_id = $_GET['item_id'] ?? null;

    if (!$audit_id || !$item_id) {
        jsonError('Audit ID dan Item ID diperlukan', 400);
    }

    $stmt = $pdo->prepare("SELECT status, notes FROM audit_item_results WHERE audit_id = ? AND item_id = ?");
    $stmt->execute([$audit_id, $item_id]);
    $result = $stmt->fetch();

    if (!$result) {
        // Return default if not evaluated yet
        jsonResponse(['success' => true, 'data' => ['status' => 'pending', 'notes' => '']]);
    } else {
        jsonResponse(['success' => true, 'data' => $result]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $audit_id = $input['audit_id'] ?? null;
    $item_id = $input['item_id'] ?? null;
    $status = $input['status'] ?? 'pending';
    $notes = $input['notes'] ?? '';

    if (!$audit_id || !$item_id) {
        jsonError('Audit ID dan Item ID diperlukan', 400);
    }

    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM audit_item_results WHERE audit_id = ? AND item_id = ?");
    $stmt->execute([$audit_id, $item_id]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        // Update
        $stmt = $pdo->prepare("UPDATE audit_item_results SET status = ?, notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?");
        $stmt->execute([$status, $notes, $user['id'], $existing]);
    } else {
        // Insert
        $stmt = $pdo->prepare("INSERT INTO audit_item_results (audit_id, item_id, status, notes, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$audit_id, $item_id, $status, $notes, $user['id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Hasil evaluasi disimpan']);
} else {
    jsonError('Method not allowed', 405);
}
