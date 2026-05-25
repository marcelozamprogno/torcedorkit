const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// 1. Zero-dependency local environment variable loader
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                    value = value.substring(1, value.length - 1);
                }
                if (!process.env[key]) {
                    process.env[key] = value.trim();
                }
            }
        });
    }
} catch (e) {
    console.warn("Failed to load local .env:", e.message);
}

// Ensure defaults for optional configs
process.env.INVICTUS_PAY_BASE_URL = process.env.INVICTUS_PAY_BASE_URL || 'https://api.invictuspay.app.br/api/public/v1';
process.env.INVICTUS_PAY_PRODUCT_HASH = process.env.INVICTUS_PAY_PRODUCT_HASH || 'pcyfgyy0y';
process.env.INVICTUS_PAY_OFFER_HASH = process.env.INVICTUS_PAY_OFFER_HASH || 'mpljoroel6';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
        const { customer, address, shipping_method, tracking } = req.body;

        // 2. Validate essential parameters in server
        if (!customer || !customer.name || !customer.email || !customer.phone || !customer.cpf) {
            return res.status(400).json({ error: "Dados de cliente incompletos." });
        }

        if (!address || !address.cep || !address.street || !address.number || !address.neighborhood || !address.city || !address.state) {
            return res.status(400).json({ error: "Dados de endereço incompletos." });
        }

        if (!shipping_method || (shipping_method !== 'free' && shipping_method !== 'fast')) {
            return res.status(400).json({ error: "Método de frete inválido." });
        }

        // 3. Clean formatations (Only digits)
        const cleanCpf = customer.cpf.replace(/\D/g, "");
        const cleanPhone = customer.phone.replace(/\D/g, "");
        const cleanCep = address.cep.replace(/\D/g, "");

        if (cleanCpf.length !== 11) {
            return res.status(400).json({ error: "CPF precisa conter exatamente 11 dígitos." });
        }

        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            return res.status(400).json({ error: "WhatsApp inválido." });
        }

        if (cleanCep.length !== 8) {
            return res.status(400).json({ error: "CEP inválido." });
        }

        // 4. Calculate total securely on server (prices in centavos)
        let amount = 6990; // R$ 69,90 default
        if (shipping_method === 'fast') {
            amount = 8980; // R$ 69,90 + R$ 19,90
        }

        // 5. Mount payload for Invictus Pay
        const apiPayload = {
            amount: amount,
            offer_hash: process.env.INVICTUS_PAY_OFFER_HASH,
            payment_method: "pix",
            customer: {
                name: customer.name.trim(),
                email: customer.email.trim(),
                phone_number: cleanPhone,
                document: cleanCpf
            },
            cart: [
                {
                    product_hash: process.env.INVICTUS_PAY_PRODUCT_HASH,
                    title: "Kit Copa Completo",
                    price: amount,
                    quantity: 1,
                    operation_type: 1,
                    tangible: true
                }
            ],
            expire_in_days: 1,
            transaction_origin: "api",
            tracking: {
                src: (tracking && tracking.src) || "",
                utm_source: (tracking && tracking.utm_source) || "",
                utm_medium: (tracking && tracking.utm_medium) || "",
                utm_campaign: (tracking && tracking.utm_campaign) || "",
                utm_term: (tracking && tracking.utm_term) || "",
                utm_content: (tracking && tracking.utm_content) || ""
            },
            postback_url: "https://kitselecaobrasileira.shop/api/invictus-webhook"
        };

        // Validate API Token existence
        const apiToken = process.env.INVICTUS_PAY_API_TOKEN;
        if (!apiToken || apiToken.trim() === "") {
            console.error("[ERROR] INVICTUS_PAY_API_TOKEN is missing in server environment.");
            return res.status(401).json({ 
                error: "Erro de autenticação na integração de pagamento. Verifique o token da Invictus Pay." 
            });
        }

        // 6. Request to Invictus Pay API via standard https module
        const apiUrl = `${process.env.INVICTUS_PAY_BASE_URL}/transactions?api_token=${apiToken}`;
        
        console.log(`[Invictus API Request] Dispatched payment generation. Amount: ${amount}. Offer: ${process.env.INVICTUS_PAY_OFFER_HASH}`);

        const apiResult = await makeHttpsRequest(apiUrl, 'POST', {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, apiPayload);

        const responseStatus = apiResult.statusCode;
        const responseBody = JSON.parse(apiResult.body || '{}');

        // Log transaction payload & raw response cleanly (censoring secret token)
        console.log(`[Invictus API Response] Status: ${responseStatus}.`);
        if (responseStatus < 200 || responseStatus >= 300) {
            console.error("[Invictus Pay API Error Report]:", {
                httpStatus: responseStatus,
                sentPayload: { ...apiPayload, customer: { ...apiPayload.customer, document: "CENSORED" } },
                responseError: responseBody
            });

            // Specific error status codes handling
            if (responseStatus === 401) {
                return res.status(401).json({ 
                    error: "Erro de autenticação na integração de pagamento. Verifique o token da Invictus Pay." 
                });
            }
            if (responseStatus === 400 || responseStatus === 422) {
                return res.status(responseStatus).json({ 
                    error: "Algum dado está incorreto. Verifique CPF, e-mail e telefone.",
                    details: responseBody
                });
            }
            return res.status(500).json({ 
                error: "Instabilidade temporária ao gerar o pagamento. Tente novamente em alguns instantes.",
                details: responseBody
            });
        }

        // 7. Extract payment fields recursively for maximum flexibility
        const extracted = extractPaymentFields(responseBody);
        
        // Return cleaned variables to client
        return res.status(200).json({
            success: true,
            transactionId: extracted.transactionId || responseBody.id || null,
            status: extracted.status || "pending",
            pixCode: extracted.pixCode || null,
            qrCodeImage: extracted.qrCodeImage || null,
            paymentUrl: extracted.paymentUrl || null,
            total: amount / 100
        });

    } catch (err) {
        console.error("[Fatal Server Error]:", err);
        return res.status(500).json({ 
            error: "Instabilidade temporária ao gerar o pagamento. Tente novamente em alguns instantes.",
            message: err.message
        });
    }
};

/**
 * Perform HTTPS requests recursively using Node.js core library
 */
function makeHttpsRequest(apiUrl, method, headers, body) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(apiUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: method,
            headers: headers
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: responseBody
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Searches the response recursively for target keys, adapting to different API formats
 */
function extractPaymentFields(responseObj) {
    const keysMap = {
        transactionId: ['id', 'transaction_id', 'transaction_hash', 'hash', 'payment_id'],
        status: ['status'],
        pixCode: ['pix_copy_paste', 'copy_paste', 'pix_code', 'qr_code', 'pix_qr_code', 'br_code', 'emv', 'payload'],
        qrCodeImage: ['qr_code_image', 'qr_code_base64', 'pix_qr_code_image', 'qr_code_url', 'payment_qr_code'],
        paymentUrl: ['checkout_url', 'payment_url', 'url']
    };
    
    const result = {
        transactionId: null,
        status: null,
        pixCode: null,
        qrCodeImage: null,
        paymentUrl: null
    };

    function searchKeys(obj) {
        if (!obj || typeof obj !== 'object') return;
        
        for (const [key, val] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            
            for (const [targetKey, possibleNames] of Object.entries(keysMap)) {
                if (possibleNames.includes(lowerKey) && val !== null && val !== undefined) {
                    if (!result[targetKey]) {
                        result[targetKey] = String(val);
                    }
                }
            }

            if (typeof val === 'object' && val !== null) {
                searchKeys(val);
            }
        }
    }

    searchKeys(responseObj);
    return result;
}
