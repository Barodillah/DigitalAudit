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
    $dealer_id = $_GET['dealer_id'] ?? null;
    
    if (!$dealer_id) {
        jsonError('Dealer ID diperlukan', 400);
    }

    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE dealer_id = ? AND role = 'reviewer' ORDER BY name ASC");
    $stmt->execute([$dealer_id]);
    $reviewers = $stmt->fetchAll();

    jsonResponse(['success' => true, 'data' => $reviewers]);
} else {
    jsonError('Method not allowed', 405);
}
