// ─────────────────────────────────────────────────────────
// Background Status Worker
// Automatically transitions event statuses based on time
// ─────────────────────────────────────────────────────────
const EventModel = require('../models/eventModel');

/**
 * Starts a background loop to check and update event statuses
 * @param {import('socket.io').Server} io - Socket.io instance
 */
function startStatusWorker(io) {
    console.log('🕒  Status worker started (interval: 60s)');

    // Run every 60 seconds
    setInterval(async () => {
        try {
            // console.log('🔄  Checking for status transitions...');
            const changed = await EventModel.autoUpdateStatuses();

            if (changed) {
                console.log('✨  Automatic status transition detected — broadcasting sync');

                // Fetch all events and broadcast full sync to all clients
                const events = await EventModel.getAll();
                io.emit('fullSync', events);
            }
        } catch (err) {
            console.error('❌  Status worker error:', err.message);
        }
    }, 60000);
}

module.exports = startStatusWorker;
