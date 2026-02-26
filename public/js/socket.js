// ─────────────────────────────────────────────────────────
// socket.js — Socket.io client wrapper
// ─────────────────────────────────────────────────────────

const SyncSocket = (() => {
    const socket = io();
    const listeners = {};

    // ── Connection status ──────────────────────────────────
    socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
        _fire('statusChange', { connected: true });
        // Request a full sync on (re)connect
        socket.emit('event:request-sync');
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        _fire('statusChange', { connected: false });
    });

    // ── Real-time event broadcasts from server ─────────────
    socket.on('event:created', (event) => {
        console.log('📨 event:created', event);
        _fire('eventCreated', event);
    });

    socket.on('event:updated', (event) => {
        console.log('📨 event:updated', event);
        _fire('eventUpdated', event);
    });

    socket.on('event:deleted', (data) => {
        console.log('📨 event:deleted', data);
        _fire('eventDeleted', data);
    });

    // ── Full sync (initial load or manual refresh) ─────────
    socket.on('event:full-sync', (events) => {
        console.log('📨 event:full-sync', events.length, 'events');
        _fire('fullSync', events);
    });

    // ── RSVP update ───────────────────────────────────────
    socket.on('event:rsvpUpdate', (data) => {
        console.log('📨 event:rsvpUpdate', data);
        _fire('rsvpUpdate', data);
    });

    // ── Connected client count ─────────────────────────────
    socket.on('sync:clients', (data) => {
        _fire('clientCount', data);
    });

    // ── Internal pub/sub ───────────────────────────────────
    function on(eventName, callback) {
        if (!listeners[eventName]) listeners[eventName] = [];
        listeners[eventName].push(callback);
    }

    function _fire(eventName, payload) {
        (listeners[eventName] || []).forEach(cb => cb(payload));
    }

    function requestSync() {
        socket.emit('event:request-sync');
    }

    return { on, requestSync };
})();
