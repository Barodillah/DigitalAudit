<?php
require_once __DIR__ . '/config.php';

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401, 'UNAUTHORIZED');
}

$token = substr($authHeader, 7);
$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT u.id, u.role, u.dealer_id 
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > NOW()
");
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user) {
    jsonError('Unauthorized', 401, 'UNAUTHORIZED');
}

$method = $_SERVER['REQUEST_METHOD'];
$myDealerId = $user['dealer_id'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_staff') {
        $dealer_id = $_GET['dealer_id'] ?? $myDealerId;
        
        $where = "role IN ('staff', 'admin')";
        $params = [];
        
        if ($dealer_id) {
            $where .= " AND dealer_id = ?";
            $params[] = $dealer_id;
        }
        
        $stmt = $pdo->prepare("SELECT id, name, role, division FROM users WHERE $where ORDER BY name ASC");
        $stmt->execute($params);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    else if ($action === 'get_assignments') {
        $audit_id = $_GET['audit_id'] ?? null;
        $item_id = $_GET['item_id'] ?? null;
        
        if (!$audit_id || !$item_id) jsonError('Missing parameters', 422);
        
        $stmt = $pdo->prepare("
            SELECT a.user_id, u.name, u.role 
            FROM audit_item_assignments a
            JOIN users u ON u.id = a.user_id
            WHERE a.audit_id = ? AND a.item_id = ?
        ");
        $stmt->execute([$audit_id, $item_id]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    else if ($action === 'get_my_item_ids') {
        $audit_id = $_GET['audit_id'] ?? null;
        if (!$audit_id) jsonError('Missing parameters', 422);
        
        $stmt = $pdo->prepare("SELECT item_id FROM audit_item_assignments WHERE audit_id = ? AND user_id = ?");
        $stmt->execute([$audit_id, $user['id']]);
        
        $ids = [];
        while ($row = $stmt->fetch()) {
            $ids[] = $row['item_id'];
        }
        jsonResponse(['success' => true, 'data' => $ids]);
    }
    else {
        jsonError('Invalid action', 400);
    }
}
elseif ($method === 'POST') {
    // Save assignments (Replace all existing assignments for the item)
    $input = json_decode(file_get_contents('php://input'), true);
    $audit_id = $input['audit_id'] ?? null;
    $item_ids = is_array($input['item_id']) ? $input['item_id'] : [$input['item_id']];
    $user_ids = $input['user_ids'] ?? [];
    
    if (!$audit_id || empty($item_ids)) jsonError('Missing parameters', 422);
    
    try {
        $pdo->beginTransaction();
        
        $del = $pdo->prepare("DELETE FROM audit_item_assignments WHERE audit_id = ? AND item_id = ?");
        $ins = $pdo->prepare("INSERT INTO audit_item_assignments (audit_id, item_id, user_id) VALUES (?, ?, ?)");
        
        foreach ($item_ids as $id) {
            // Delete old assignments
            $del->execute([$audit_id, $id]);
            
            // Insert new ones
            if (!empty($user_ids)) {
                foreach ($user_ids as $uid) {
                    $ins->execute([$audit_id, $id, $uid]);
                }
            }
        }
        
        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'Assignments saved successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Failed to save assignments', 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
