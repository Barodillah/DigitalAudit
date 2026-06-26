<?php
/**
 * Auth Check (Session Validation) Endpoint
 * GET /api/me
 * Header: Authorization: Bearer <token>
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
}

// Ambil token dari header Authorization
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';

if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Token tidak ditemukan', 401, 'UNAUTHORIZED');
}

$token = substr($authHeader, 7);

try {
    $pdo = getDB();

    // Cari session yang masih valid
    $stmt = $pdo->prepare("
        SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.role, u.dealer_id, d.name AS dealer_name, d.code AS dealer_code
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN dealers d ON d.id = u.dealer_id
        WHERE s.token = ? AND s.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $session = $stmt->fetch();

    if (!$session) {
        jsonError('Sesi tidak valid atau telah kadaluarsa', 401, 'SESSION_EXPIRED');
    }

    jsonResponse([
        'success' => true,
        'data'    => [
            'user' => [
                'id'          => (int) $session['id'],
                'name'        => $session['name'],
                'email'       => $session['email'],
                'role'        => $session['role'],
                'dealer_id'   => $session['dealer_id'] ? (int) $session['dealer_id'] : null,
                'dealer_name' => $session['dealer_name'],
                'dealer_code' => $session['dealer_code'],
            ],
            'expires_at' => $session['expires_at'],
        ]
    ]);

} catch (PDOException $e) {
    jsonError('Terjadi kesalahan server', 500, 'SERVER_ERROR');
}
