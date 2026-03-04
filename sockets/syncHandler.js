// ─────────────────────────────────────────────────────────
// Socket.io Sync Handler
// ─────────────────────────────────────────────────────────
const EventModel = require('../models/eventModel');

let connectedClients = 0;

function syncHandler(io) {
    io.on('connection', (socket) => {
        connectedClients++;
        console.log(`🔌  Client connected: ${socket.id}  (total: ${connectedClients})`);

        // Tell every client how many are online
        io.emit('sync:clients', { count: connectedClients });

        // ── Client requests a full data refresh ────────────
        socket.on('event:request-sync', async () => {
            try {
                const events = await EventModel.getAll();
                socket.emit('event:full-sync', events);
            } catch (err) {
                socket.emit('sync:error', { message: err.message });
            }
        });

        // ── Admin: Sync user role changes live ──────────────
        socket.on('role-updated', (data) => {
            // Broadcast to everyone else
            socket.broadcast.emit('role-synced', data);
        });

        // ── Disconnect ─────────────────────────────────────
        socket.on('disconnect', () => {
            connectedClients--;
            console.log(`❌  Client disconnected: ${socket.id}  (total: ${connectedClients})`);
            io.emit('sync:clients', { count: connectedClients });
        });
    });
}

module.exports = syncHandler;
