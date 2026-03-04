// ─────────────────────────────────────────────────────────
// User Model — SQL query functions
// ─────────────────────────────────────────────────────────
const pool = require('../config/db');

const UserModel = {
    // ── Find user by email ────────────────────────────────
    async findByEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        return rows[0] || null;
    },

    // ── Find user by id ───────────────────────────────────
    async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, username, email, role, avatar_color, created_at FROM users WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    // ── Create a new user ─────────────────────────────────
    async create({ username, email, password_hash, role, avatar_color }) {
        const userRole = role || 'user';
        const color = avatar_color || _randomColor();
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)',
            [username, email, password_hash, userRole, color]
        );
        return this.findById(result.insertId);
    },

    // ── Get all users (admin panel) ──────────────────────
    async getAll() {
        const [rows] = await pool.query(
            'SELECT id, username, email, role, avatar_color, created_at FROM users ORDER BY created_at ASC'
        );
        return rows;
    },

    // ── Get all events a user is registered for ──────────
    async getRegistrations(userId) {
        const [rows] = await pool.query(`
      SELECT e.id, e.title, e.event_date, e.event_end_date, e.event_time, e.event_end_time, e.status, ep.joined_at
      FROM event_participants ep
      JOIN events e ON ep.event_id = e.id
      WHERE ep.user_id = ?
      ORDER BY e.event_date DESC, e.event_time DESC
    `, [userId]);
        return rows;
    },

    // ── Update user role ─────────────────────────────────
    async updateRole(id, role) {
        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        return this.findById(id);
    }
};

// ── Internal: pick a random avatar accent colour ──────────
function _randomColor() {
    const palette = ['#6C63FF', '#FF6584', '#43E97B', '#F9A826', '#00C9FF', '#F64F59', '#43CBFF'];
    return palette[Math.floor(Math.random() * palette.length)];
}

module.exports = UserModel;
