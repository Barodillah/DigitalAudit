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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

if (!isset($_POST['audit_id']) || !isset($_POST['item_id'])) {
    jsonError('Audit ID dan Item ID diperlukan', 400);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonError('Gagal mengupload file', 400);
}

$audit_id = $_POST['audit_id'];
$item_id = $_POST['item_id'];
$file = $_FILES['file'];

// Validasi ukuran (maks 5MB)
if ($file['size'] > 5 * 1024 * 1024) {
    jsonError('Ukuran file maksimal 5MB', 400);
}

// Ensure the result record exists
$stmt = $pdo->prepare("SELECT id FROM audit_item_results WHERE audit_id = ? AND item_id = ?");
$stmt->execute([$audit_id, $item_id]);
$resultId = $stmt->fetchColumn();

if (!$resultId) {
    $stmt = $pdo->prepare("INSERT INTO audit_item_results (audit_id, item_id, status) VALUES (?, ?, 'pending')");
    $stmt->execute([$audit_id, $item_id]);
    $resultId = $pdo->lastInsertId();
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
// Rename with UUID to ensure uniqueness
$uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
);
$filename = $uuid . '.' . $ext;
$destination = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    $fileUrl = 'uploads/' . $filename;
    
    $stmt = $pdo->prepare("
        INSERT INTO audit_evidences (result_id, file_url, file_type, original_name, file_size, uploaded_by) 
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $resultId,
        $fileUrl,
        $file['type'],
        $file['name'],
        $file['size'],
        $user['id']
    ]);
    
    $evidenceId = $pdo->lastInsertId();

    // Fetch the newly inserted record to return to frontend
    $stmt = $pdo->prepare("SELECT * FROM audit_evidences WHERE id = ?");
    $stmt->execute([$evidenceId]);
    $evidence = $stmt->fetch();

    $baseUrl = 'https://csdwindo.com/audit/';
    if (strpos($evidence['file_url'], 'http') !== 0) {
        $evidence['file_url'] = $baseUrl . $evidence['file_url'];
    }

    jsonResponse([
        'success' => true,
        'message' => 'File berhasil diunggah',
        'data' => $evidence
    ]);
} else {
    jsonError('Gagal menyimpan file', 500);
}
