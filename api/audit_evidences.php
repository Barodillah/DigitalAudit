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
    if (!isset($_GET['audit_id']) || !isset($_GET['item_id'])) {
        jsonError('Audit ID dan Item ID diperlukan', 400);
    }
    
    $audit_id = $_GET['audit_id'];
    $item_id = $_GET['item_id'];

    $stmt = $pdo->prepare("
        SELECT e.* 
        FROM audit_evidences e
        JOIN audit_item_results r ON r.id = e.result_id
        WHERE r.audit_id = ? AND r.item_id = ?
        ORDER BY e.uploaded_at DESC
    ");
    $stmt->execute([$audit_id, $item_id]);
    $evidences = $stmt->fetchAll();

    // Map file_url to full URL if needed, but since frontend uses same domain, relative is fine
    // just prepend the base URL
    $baseUrl = 'https://csdwindo.com/audit/';
    foreach ($evidences as &$ev) {
        if (strpos($ev['file_url'], 'http') !== 0) {
            $ev['file_url'] = $baseUrl . $ev['file_url'];
        }
    }

    jsonResponse(['success' => true, 'data' => $evidences]);
}
// Update Caption
elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['id'])) jsonError('ID diperlukan', 400);

    $caption = isset($input['caption']) ? $input['caption'] : null;

    $stmt = $pdo->prepare("UPDATE audit_evidences SET caption = ? WHERE id = ?");
    $stmt->execute([$caption, $input['id']]);

    jsonResponse(['success' => true, 'message' => 'Caption berhasil diperbarui']);
}
// DELETE if needed
elseif ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['id'])) jsonError('ID diperlukan', 400);

    $stmt = $pdo->prepare("SELECT file_url FROM audit_evidences WHERE id = ?");
    $stmt->execute([$input['id']]);
    $file = $stmt->fetchColumn();

    if ($file) {
        $filePath = __DIR__ . '/../' . str_replace('https://csdwindo.com/audit/', '', $file);
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }

    $stmt = $pdo->prepare("DELETE FROM audit_evidences WHERE id = ?");
    $stmt->execute([$input['id']]);

    jsonResponse(['success' => true, 'message' => 'Evidence dihapus']);
} else {
    jsonError('Method not allowed', 405);
}
