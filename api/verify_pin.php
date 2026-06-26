<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $pin = $input['pin'] ?? null;

    if (!$pin) {
        jsonError('PIN diperlukan', 400);
    }

    $pdo = getDB();

    // Find the link
    $stmt = $pdo->prepare("
        SELECT al.id, al.uuid, al.audit_id, al.status, al.expired_at, a.reviewer_id 
        FROM audit_links al
        JOIN audits a ON a.id = al.audit_id
        WHERE al.pin = ? AND al.status = 'active'
    ");
    $stmt->execute([$pin]);
    $link = $stmt->fetch();

    if (!$link) {
        jsonError('PIN tidak valid atau sudah tidak aktif', 404);
    }

    if (strtotime($link['expired_at']) < time()) {
        // Expired
        $stmt = $pdo->prepare("UPDATE audit_links SET status = 'expired' WHERE id = ?");
        $stmt->execute([$link['id']]);
        jsonError('Link sudah kedaluwarsa', 403);
    }

    if (!$link['reviewer_id']) {
        jsonError('Reviewer belum di-set untuk audit ini', 400);
    }

    // Generate a session token for the reviewer
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 day'));

    $stmt = $pdo->prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$link['reviewer_id'], $token, $expires]);

    // Also get user info to send back
    $stmt = $pdo->prepare("SELECT id, name, email, role, dealer_id FROM users WHERE id = ?");
    $stmt->execute([$link['reviewer_id']]);
    $user = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'message' => 'PIN Valid',
        'data' => [
            'uuid' => $link['uuid'],
            'token' => $token,
            'user' => $user
        ]
    ]);
} else {
    jsonError('Method not allowed', 405);
}
