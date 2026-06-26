<?php
require_once __DIR__ . '/config.php';

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401);
}

$token = substr($authHeader, 7);
$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT u.id, u.role
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
    $audit_id = $_GET['audit_id'] ?? null;
    if (!$audit_id) jsonError('Audit ID diperlukan', 400);

    // Ambil template_id
    $stmt = $pdo->prepare("SELECT template_id FROM audits WHERE id = ?");
    $stmt->execute([$audit_id]);
    $template_id = $stmt->fetchColumn();

    if (!$template_id) jsonError('Audit tidak ditemukan', 404);

    $stmt = $pdo->prepare("SELECT level, label FROM audit_level_configs WHERE template_id = ? ORDER BY level ASC");
    $stmt->execute([$template_id]);
    $levels = $stmt->fetchAll();

    jsonResponse(['success' => true, 'data' => $levels]);
}
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $audit_id = $input['audit_id'] ?? null;
    $levels = $input['levels'] ?? [];

    if (!$audit_id || empty($levels)) jsonError('Audit ID dan levels diperlukan', 400);

    // Ambil template_id
    $stmt = $pdo->prepare("SELECT template_id, status FROM audits WHERE id = ?");
    $stmt->execute([$audit_id]);
    $audit = $stmt->fetch();

    if (!$audit) jsonError('Audit tidak ditemukan', 404);
    if ($audit['status'] !== 'draft') jsonError('Hanya bisa setup level pada audit berstatus draft', 403);

    $template_id = $audit['template_id'];

    try {
        $pdo->beginTransaction();

        // Hapus existing config
        $stmt = $pdo->prepare("DELETE FROM audit_level_configs WHERE template_id = ?");
        $stmt->execute([$template_id]);

        // Insert new config
        foreach ($levels as $idx => $lvl) {
            $stmt = $pdo->prepare("INSERT INTO audit_level_configs (template_id, level, label, sort_order) VALUES (?, ?, ?, ?)");
            $stmt->execute([$template_id, $idx, $lvl['label'], $idx]);
        }

        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'Konfigurasi level berhasil disimpan']);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Gagal menyimpan konfigurasi: ' . $e->getMessage(), 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
