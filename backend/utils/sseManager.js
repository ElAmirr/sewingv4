/**
 * SSE (Server-Sent Events) Manager
 * Maintains a registry of all connected clients and provides a broadcast function.
 */

const clients = new Map(); // clientId -> response object
let clientIdCounter = 0;

/**
 * Adds a new SSE client connection.
 * Sets up the correct headers and sends an initial "connected" ping.
 */
export function addClient(req, res) {
    const clientId = ++clientIdCounter;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
    res.flushHeaders();

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

    clients.set(clientId, res);
    console.log(`[SSE] Client ${clientId} connected. Total: ${clients.size}`);

    // Clean up on disconnect
    req.on("close", () => {
        clients.delete(clientId);
        console.log(`[SSE] Client ${clientId} disconnected. Total: ${clients.size}`);
    });

    return clientId;
}

/**
 * Broadcasts an event to ALL connected clients.
 * @param {string} eventType - e.g. "session_ended", "storage_alert"
 * @param {object} payload - any JSON-serializable data
 */
export function broadcast(eventType, payload = {}) {
    const message = `data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`;
    let sent = 0;

    for (const [id, res] of clients) {
        try {
            res.write(message);
            sent++;
        } catch (err) {
            console.warn(`[SSE] Failed to send to client ${id}, removing.`);
            clients.delete(id);
        }
    }

    if (sent > 0) {
        console.log(`[SSE] Broadcast '${eventType}' to ${sent} client(s).`);
    }
}

export function getClientCount() {
    return clients.size;
}
