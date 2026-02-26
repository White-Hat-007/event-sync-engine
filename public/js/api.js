// ─────────────────────────────────────────────────────────
// api.js — Fetch API wrapper for event CRUD + auth + RSVP
// ─────────────────────────────────────────────────────────
const API_BASE = '/api/events';
const AUTH_BASE = '/api/auth';

// ── Helper: get stored JWT ────────────────────────────────
function _authHeader() {
    const token = localStorage.getItem('eventsync_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ── Auth helpers ──────────────────────────────────────────
const Auth = {
    async register(username, email, password) {
        const res = await fetch(`${AUTH_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json;
    },

    async login(email, password) {
        const res = await fetch(`${AUTH_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json;
    },

    async me() {
        const res = await fetch(`${AUTH_BASE}/me`, {
            headers: { ..._authHeader() }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.user;
    },

    logout() {
        localStorage.removeItem('eventsync_token');
        localStorage.removeItem('eventsync_user');
        window.location.replace('/login.html');
    },

    async fetchAllUsers() {
        const res = await fetch(`${AUTH_BASE}/users`, {
            headers: { ..._authHeader() }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    }
};

// ── Event API ─────────────────────────────────────────────
const Api = {
    async fetchEvents() {
        const res = await fetch(API_BASE);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    async fetchEvent(id) {
        const res = await fetch(`${API_BASE}/${id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    async createEvent(data) {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ..._authHeader() },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    async updateEvent(id, data) {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ..._authHeader() },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    async deleteEvent(id) {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: { ..._authHeader() }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    // ── RSVP: register for an event ───────────────────────
    async rsvpEvent(id) {
        const res = await fetch(`${API_BASE}/${id}/rsvp`, {
            method: 'POST',
            headers: { ..._authHeader() }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json;
    },

    // ── RSVP: cancel registration ─────────────────────────
    async cancelRsvp(id) {
        const res = await fetch(`${API_BASE}/${id}/rsvp`, {
            method: 'DELETE',
            headers: { ..._authHeader() }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json;
    },

    // ── Get participants for an event ─────────────────────
    async fetchParticipants(id) {
        const res = await fetch(`${API_BASE}/${id}/participants`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    async fetchSyncLog() {
        const res = await fetch(`${API_BASE}/sync/log`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    }
};
