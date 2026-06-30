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

$myDealerId = $user['dealer_id'];

// Get total ongoing audits
$auditWhere = "status = 'ongoing'";
$auditParams = [];
if ($user['role'] !== 'super_admin') {
    $auditWhere .= " AND dealer_id = ?";
    $auditParams[] = $myDealerId;
}

$stmt = $pdo->prepare("SELECT COUNT(*) FROM audits WHERE $auditWhere");
$stmt->execute($auditParams);
$totalOngoing = $stmt->fetchColumn();

// Get total my tasks (assigned items in ongoing audits)
$stmtTasks = $pdo->prepare("
    SELECT 
        COUNT(a.item_id) as total_tasks,
        SUM(CASE WHEN EXISTS (
            SELECT 1 FROM audit_item_results air 
            JOIN audit_evidences ae ON ae.result_id = air.id 
            WHERE air.audit_id = a.audit_id AND air.item_id = a.item_id
        ) THEN 1 ELSE 0 END) as completed_tasks
    FROM audit_item_assignments a
    JOIN audits au ON au.id = a.audit_id
    WHERE a.user_id = ? AND au.status = 'ongoing'
");
$stmtTasks->execute([$user['id']]);
$tasks = $stmtTasks->fetch();

$totalTasks = (int)($tasks['total_tasks'] ?? 0);
$completedTasks = (int)($tasks['completed_tasks'] ?? 0);
$pendingTasks = $totalTasks - $completedTasks;

jsonResponse([
    'success' => true,
    'data' => [
        'ongoing_audits' => (int)$totalOngoing,
        'my_tasks' => [
            'total' => $totalTasks,
            'completed' => $completedTasks,
            'pending' => $pendingTasks
        ]
    ]
]);
