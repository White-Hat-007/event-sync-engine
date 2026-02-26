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
    }
};

// ── Internal: pick a random avatar accent colour ──────────
function _randomColor() {
    const palette = ['#6C63FF', '#FF6584', '#43E97B', '#F9A826', '#00C9FF', '#F64F59', '#43CBFF'];
    return palette[Math.floor(Math.random() * palette.length)];
}

module.exports = UserModel;
