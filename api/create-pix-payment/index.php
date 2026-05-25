<?php
/**
 * Hostinger PHP API Endpoint - Create Pix Payment via Invictus Pay
 * Autodetects and parses root .env securely on Hostinger plans.
 */

// 1. Enable CORS & Options Preflight
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit();
}

// 2. Load and Parse Root .env
loadEnv();

// Set Defaults
$_ENV['INVICTUS_PAY_BASE_URL'] = $_ENV['INVICTUS_PAY_BASE_URL'] ?? 'https://api.invictuspay.app.br/api/public/v1';
$_ENV['INVICTUS_PAY_PRODUCT_HASH'] = $_ENV['INVICTUS_PAY_PRODUCT_HASH'] ?? 'pcyfgyy0y';
$_ENV['INVICTUS_PAY_OFFER_HASH'] = $_ENV['INVICTUS_PAY_OFFER_HASH'] ?? 'mpljoroel6';

// 3. Process Input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$customer = $input['customer'] ?? null;
$address = $input['address'] ?? null;
$shippingMethod = $input['shipping_method'] ?? null;
$tracking = $input['tracking'] ?? null;

// Validate Inputs
if (!$customer || empty($customer['name']) || empty($customer['email']) || empty($customer['phone']) || empty($customer['cpf'])) {
    http_response_code(400);
    echo json_encode(["error" => "Dados de cliente incompletos."]);
    exit();
}

if (!$address || empty($address['cep']) || empty($address['street']) || empty($address['number']) || empty($address['neighborhood']) || empty($address['city']) || empty($address['state'])) {
    http_response_code(400);
    echo json_encode(["error" => "Dados de endereço incompletos."]);
    exit();
}

if (!$shippingMethod || ($shippingMethod !== 'free' && $shippingMethod !== 'fast')) {
    http_response_code(400);
    echo json_encode(["error" => "Método de frete inválido."]);
    exit();
}

// 4. Clean Formatations (Only digits)
$cleanCpf = preg_replace('/\D/', '', $customer['cpf']);
$cleanPhone = preg_replace('/\D/', '', $customer['phone']);
$cleanCep = preg_replace('/\D/', '', $address['cep']);

if (strlen($cleanCpf) !== 11) {
    http_response_code(400);
    echo json_encode(["error" => "CPF precisa conter exatamente 11 dígitos."]);
    exit();
}

if (strlen($cleanPhone) < 10 || strlen($cleanPhone) > 11) {
    http_response_code(400);
    echo json_encode(["error" => "WhatsApp inválido."]);
    exit();
}

if (strlen($cleanCep) !== 8) {
    http_response_code(400);
    echo json_encode(["error" => "CEP inválido."]);
    exit();
}

// 5. Calculate Total securely on server (in centavos)
$amount = 6990; // Default Free
if ($shippingMethod === 'fast') {
    $amount = 8980; // Express
}

// 6. Check Token Existence
$apiToken = $_ENV['INVICTUS_PAY_API_TOKEN'] ?? '';
if (empty($apiToken)) {
    error_log("[PHP ERROR] INVICTUS_PAY_API_TOKEN is missing in Hostinger environment.");
    http_response_code(401);
    echo json_encode([
        "error" => "Token de API não configurado. Por favor, crie um arquivo chamado '.env' no diretório raiz da sua hospedagem Hostinger contendo a seguinte linha: INVICTUS_PAY_API_TOKEN=seu_token_aqui"
    ]);
    exit();
}

// 7. Mount Payload for Invictus Pay
$apiPayload = [
    "amount" => $amount,
    "offer_hash" => $_ENV['INVICTUS_PAY_OFFER_HASH'],
    "payment_method" => "pix",
    "customer" => [
        "name" => trim($customer['name']),
        "email" => trim($customer['email']),
        "phone_number" => $cleanPhone,
        "document" => $cleanCpf
    ],
    "cart" => [
        [
            "product_hash" => $_ENV['INVICTUS_PAY_PRODUCT_HASH'],
            "title" => "Kit Copa Completo",
            "price" => $amount,
            "quantity" => 1,
            "operation_type" => 1,
            "tangible" => true
        ]
    ],
    "expire_in_days" => 1,
    "transaction_origin" => "api",
    "tracking" => [
        "src" => $tracking['src'] ?? "",
        "utm_source" => $tracking['utm_source'] ?? "",
        "utm_medium" => $tracking['utm_medium'] ?? "",
        "utm_campaign" => $tracking['utm_campaign'] ?? "",
        "utm_term" => $tracking['utm_term'] ?? "",
        "utm_content" => $tracking['utm_content'] ?? ""
    ],
    "postback_url" => "https://kitselecaobrasileira.shop/api/invictus-webhook"
];

// 8. Dispatch cURL POST request to Invictus Pay API
$apiUrl = $_ENV['INVICTUS_PAY_BASE_URL'] . "/transactions?api_token=" . $apiToken;

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($apiPayload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$responseRaw = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$responseBody = json_decode($responseRaw, true) ?? [];

// Log errors securely if they happen
if ($httpStatus < 200 || $httpStatus >= 300) {
    // Censoring sensitive numbers for safety logs
    $loggedPayload = $apiPayload;
    $loggedPayload['customer']['document'] = 'CENSORED';
    
    error_log("[Invictus Pay PHP API Error] HTTP Status: $httpStatus. Response: $responseRaw. Sent Payload: " . json_encode($loggedPayload));

    http_response_code($httpStatus);
    if ($httpStatus === 401) {
        echo json_encode(["error" => "Erro de autenticação na integração de pagamento. Verifique o token da Invictus Pay."]);
    } else if ($httpStatus === 400 || $httpStatus === 422) {
        echo json_encode(["error" => "Algum dado está incorreto. Verifique CPF, e-mail e telefone.", "details" => $responseBody]);
    } else {
        echo json_encode(["error" => "Instabilidade temporária ao gerar o pagamento. Tente novamente em alguns instantes.", "details" => $responseBody]);
    }
    exit();
}

// 9. Extract Mapped Fields Recursively
$extracted = extractPaymentFields($responseBody);

http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
    "success" => true,
    "transactionId" => $extracted['transactionId'] ?? ($responseBody['id'] ?? null),
    "status" => $extracted['status'] ?? "pending",
    "pixCode" => $extracted['pixCode'] ?? null,
    "qrCodeImage" => $extracted['qrCodeImage'] ?? null,
    "paymentUrl" => $extracted['paymentUrl'] ?? null,
    "total" => $amount / 100
]);
exit();

/**
 * Parses and loads .env values into $_ENV superglobal
 */
function loadEnv() {
    // Climb up 3 levels to locate .env at repository root
    $envPath = dirname(dirname(__DIR__)) . '/.env';
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                
                // Censor quotes
                if (preg_match('/^"(.*)"$/', $value, $matches)) {
                    $value = $matches[1];
                }
                
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
    }
}

/**
 * Searches the response array recursively for targeted variables
 */
function extractPaymentFields($array) {
    $keysMap = [
        'transactionId' => ['id', 'transaction_id', 'transaction_hash', 'hash', 'payment_id'],
        'status' => ['status'],
        'pixCode' => ['pix_copy_paste', 'copy_paste', 'pix_code', 'qr_code', 'pix_qr_code', 'br_code', 'emv', 'payload'],
        'qrCodeImage' => ['qr_code_image', 'qr_code_base64', 'pix_qr_code_image', 'qr_code_url', 'payment_qr_code'],
        'paymentUrl' => ['checkout_url', 'payment_url', 'url']
    ];

    $result = [
        'transactionId' => null,
        'status' => null,
        'pixCode' => null,
        'qrCodeImage' => null,
        'paymentUrl' => null
    ];

    $searchKeys = function($item) use (&$searchKeys, $keysMap, &$result) {
        if (!is_array($item)) return;

        foreach ($item as $key => $val) {
            $lowerKey = strtolower($key);
            
            foreach ($keysMap as $targetKey => $possibleNames) {
                if (in_array($lowerKey, $possibleNames) && $val !== null && $val !== '') {
                    if ($result[$targetKey] === null) {
                        $result[$targetKey] = is_array($val) ? json_encode($val) : strval($val);
                    }
                }
            }

            if (is_array($val)) {
                $searchKeys($val);
            }
        }
    };

    $searchKeys($array);
    return $result;
}
