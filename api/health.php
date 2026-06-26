<?php
/**
 * Health Check Endpoint
 * GET /api/health
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT 1");

    jsonResponse([
        'success'   => true,
        'message'   => 'API & Database connection OK',
        'timestamp' => date('c'),
    ]);
} catch (PDOException $e) {
    jsonError('Database connection failed: ' . $e->getMessage(), 500, 'DB_CONNECTION_FAILED');
}
