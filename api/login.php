<?php
/**
 * Login Endpoint
 * POST /api/login
 * Body: { "email": "...", "password": "..." }
 */

require_once __DIR__ . '/config.php';

// Hanya terima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
}

// Parse JSON body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['email']) || empty($input['password'])) {
    jsonError('Email dan password wajib diisi', 422, 'VALIDATION_ERROR');
}

$email    = trim($input['email']);
$password = $input['password'];

try {
    $pdo = getDB();

    // Cari user berdasarkan email
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email, u.password, u.role, u.dealer_id, d.name AS dealer_name, d.code AS dealer_code
        FROM users u
        LEFT JOIN dealers d ON d.id = u.dealer_id
        WHERE u.email = ?
        LIMIT 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Email atau password salah', 401, 'INVALID_CREDENTIALS');
    }

    // Verifikasi password (bcrypt)
    if (!password_verify($password, $user['password'])) {
        jsonError('Email atau password salah', 401, 'INVALID_CREDENTIALS');
    }

    // Hanya role tertentu yang diizinkan masuk ke portal Dealer
    $allowed_roles = ['super_admin', 'admin', 'staff'];
    if (!in_array($user['role'], $allowed_roles)) {
        jsonError('Akses ditolak: Hanya Super Admin, Admin, dan Staff yang dapat masuk ke portal ini.', 403, 'FORBIDDEN_ROLE');
    }

    // Generate session token
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // Simpan session ke database
    $stmt = $pdo->prepare("
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$user['id'], $token, $expiresAt]);

    // Response (tanpa password)
    jsonResponse([
        'success' => true,
        'message' => 'Login berhasil',
        'data'    => [
            'token' => $token,
            'user'  => [
                'id'          => (int) $user['id'],
                'name'        => $user['name'],
                'email'       => $user['email'],
                'role'        => $user['role'],
                'dealer_id'   => $user['dealer_id'] ? (int) $user['dealer_id'] : null,
                'dealer_name' => $user['dealer_name'],
                'dealer_code' => $user['dealer_code'],
            ],
            'expires_at' => $expiresAt,
        ]
    ]);

} catch (PDOException $e) {
    jsonError('Terjadi kesalahan server: ' . $e->getMessage(), 500, 'SERVER_ERROR');
}
