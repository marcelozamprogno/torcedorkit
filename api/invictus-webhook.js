/**
 * Webhook receiver for Invictus Pay postbacks
 * Safe, logging webhook notifications.
 */

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
        const payload = req.body;

        // Log the complete notification details for reference
        console.log("[Invictus Pay Webhook Received]:", JSON.stringify(payload, null, 2));

        // Stub: Prepared to parse transaction status dynamically
        // Available statuses: paid, approved, completed, pending, canceled, cancelled, refunded
        let transactionStatus = payload && (payload.status || payload.transaction_status);
        let transactionId = payload && (payload.id || payload.transaction_id || payload.hash);

        if (transactionStatus) {
            console.log(`[Invictus Webhook Stub] Transaction ${transactionId} updated status to: ${transactionStatus}`);
            
            const lowerStatus = String(transactionStatus).toLowerCase();
            if (['paid', 'approved', 'completed'].includes(lowerStatus)) {
                // TODO: Trigger TikTok server-side conversion API 'CompletePayment' / 'Purchase' securely here!
                console.log(`[Invictus Webhook Stub] Purchase validation confirmed! Triggering server-side purchase for transaction ${transactionId}`);
            }
        }

        // Always return 200 OK to Invictus Pay
        return res.status(200).json({ success: true, message: "Webhook processed successfully." });

    } catch (err) {
        console.error("[Webhook Error]:", err.message);
        return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
};
