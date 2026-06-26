<?php
require_once __DIR__ . '/config.php';

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    jsonError('Unauthorized', 401);
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
    jsonError('Unauthorized', 401);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Meminta struktur berdasarkan audit_id
    $audit_id = $_GET['audit_id'] ?? null;
    if (!$audit_id) jsonError('Audit ID diperlukan', 400);

    // Dapatkan template_id dari audit_id
    $stmt = $pdo->prepare("SELECT template_id FROM audits WHERE id = ?");
    $stmt->execute([$audit_id]);
    $template_id = $stmt->fetchColumn();

    if (!$template_id) jsonError('Audit tidak ditemukan', 404);

    // Ambil categories
    $stmt = $pdo->prepare("SELECT id, parent_id, name, level FROM audit_categories WHERE template_id = ? ORDER BY sort_order ASC, id ASC");
    $stmt->execute([$template_id]);
    $categories = $stmt->fetchAll();

    // Ambil items
    $stmt = $pdo->prepare("
        SELECT i.id, i.category_id, i.code, i.name 
        FROM audit_items i
        JOIN audit_categories c ON c.id = i.category_id
        WHERE c.template_id = ?
        ORDER BY i.sort_order ASC, i.id ASC
    ");
    $stmt->execute([$template_id]);
    $items = $stmt->fetchAll();

    // Susun tree structure
    function buildTree($elements, $parentId = null) {
        $branch = array();
        foreach ($elements as $element) {
            if ($element['parent_id'] == $parentId) {
                $children = buildTree($elements, $element['id']);
                $element['isOpen'] = true;
                if ($children) {
                    $element['children'] = $children;
                } else {
                    $element['children'] = [];
                }
                $branch[] = $element;
            }
        }
        return $branch;
    }

    $tree = buildTree($categories);

    // Masukkan items ke leaf categories
    function attachItems(&$tree, $items) {
        foreach ($tree as &$node) {
            if (!empty($node['children'])) {
                attachItems($node['children'], $items);
            } else {
                $node['items'] = [];
                foreach ($items as $item) {
                    if ($item['category_id'] == $node['id']) {
                        $node['items'][] = $item;
                    }
                }
            }
        }
    }
    attachItems($tree, $items);

    jsonResponse(['success' => true, 'data' => $tree]);
}
elseif ($method === 'POST') {
    // Simpan struktur (Overwrite)
    $input = json_decode(file_get_contents('php://input'), true);
    $audit_id = $input['audit_id'] ?? null;
    $tree = $input['tree'] ?? [];

    if (!$audit_id) jsonError('Audit ID diperlukan', 400);

    // Verifikasi audit dan ambil template_id
    $stmt = $pdo->prepare("SELECT template_id, status FROM audits WHERE id = ?");
    $stmt->execute([$audit_id]);
    $audit = $stmt->fetch();

    if (!$audit) jsonError('Audit tidak ditemukan', 404);
    if ($audit['status'] !== 'draft') {
        jsonError('Tidak dapat mengubah struktur karena audit sedang/sudah berjalan', 403);
    }

    $template_id = $audit['template_id'];

    try {
        $pdo->beginTransaction();

        // Karena ini setup draft, kita bisa wipe & replace struktur untuk template ini
        // (Asumsi "Buat dari kosong" membuat template khusus untuk audit ini)
        $stmt = $pdo->prepare("DELETE FROM audit_categories WHERE template_id = ?");
        $stmt->execute([$template_id]);

        $catSort = 0;
        $itemSort = 0;

        function insertTree($pdo, $nodes, $template_id, $parent_id, $level, &$catSort, &$itemSort) {
            foreach ($nodes as $node) {
                $stmt = $pdo->prepare("INSERT INTO audit_categories (template_id, parent_id, level, name, sort_order) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$template_id, $parent_id, $level, $node['name'], $catSort++]);
                $new_cat_id = $pdo->lastInsertId();

                if (!empty($node['children'])) {
                    insertTree($pdo, $node['children'], $template_id, $new_cat_id, $level + 1, $catSort, $itemSort);
                }

                if (!empty($node['items'])) {
                    foreach ($node['items'] as $item) {
                        $stmt = $pdo->prepare("INSERT INTO audit_items (category_id, code, name, sort_order) VALUES (?, ?, ?, ?)");
                        $stmt->execute([$new_cat_id, $item['code'] ?? null, $item['name'], $itemSort++]);
                    }
                }
            }
        }

        insertTree($pdo, $tree, $template_id, null, 0, $catSort, $itemSort);

        $pdo->commit();
        jsonResponse(['success' => true, 'message' => 'Struktur berhasil disimpan']);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Gagal menyimpan struktur: ' . $e->getMessage(), 500);
    }
}
else {
    jsonError('Method not allowed', 405);
}
