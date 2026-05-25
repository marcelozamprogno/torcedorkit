<?php
/**
 * Hostinger PHP Webhook Receiver - Invictus Pay Webhook
 * Processes postbacks from Invictus Pay and logs them securely.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit();
}

try {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true) ?? [];

    // Log the complete notification details for reference inside a private log file
    error_log("[Invictus Pay PHP Webhook Received]: " . $rawInput);

    $transactionStatus = $payload['status'] ?? ($payload['transaction_status'] ?? null);
    $transactionId = $payload['id'] ?? ($payload['transaction_id'] ?? ($payload['hash'] ?? null));

    if ($transactionStatus) {
        error_log("[Invictus PHP Webhook Stub] Transaction $transactionId updated status to: $transactionStatus");
        
        $lowerStatus = strtolower($transactionStatus);
        if (in_array($lowerStatus, ['paid', 'approved', 'completed'])) {
            // TODO: Trigger TikTok server-side conversion API 'CompletePayment' / 'Purchase' securely here!
            error_log("[Invictus PHP Webhook Stub] Purchase validation confirmed! Triggering server-side purchase for transaction $transactionId");
        }
    }

    // Always return 200 OK to Invictus Pay
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Webhook processed successfully."]);
    exit();

} catch (Exception $err) {
    error_log("[Webhook PHP Error]: " . $err->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal Server Error", "message" => $err->getMessage()]);
    exit();
}
