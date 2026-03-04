// ─────────────────────────────────────────────────────────
// Event Model — SQL query functions
// ─────────────────────────────────────────────────────────
const pool = require('../config/db');

const EventModel = {
    // ── Fetch all events (with creator username + participant count) ──
    async getAll() {
        const [rows] = await pool.query(`
      SELECT e.*, u.username AS creator_name, u.avatar_color,
             (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) AS participant_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      ORDER BY e.event_date ASC, e.event_time ASC
    `);
        return rows;
    },

    // ── Fetch single event by ID ──────────────────────────
    async getById(id) {
        const [rows] = await pool.query(`
      SELECT e.*, u.username AS creator_name, u.avatar_color,
             (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) AS participant_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `, [id]);
        return rows[0] || null;
    },

    // ── Create a new event ────────────────────────────────
    async create(data) {
        const { title, description, event_date, event_end_date, event_time, event_end_time, location, priority, status, created_by } = data;
        const [result] = await pool.query(`
      INSERT INTO events (title, description, event_date, event_end_date, event_time, event_end_time, location, priority, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, description || null, event_date, event_end_date || null, event_time, event_end_time || null, location || null, priority || 'medium', status || 'upcoming', created_by || 1]);
        return this.getById(result.insertId);
    },

    // ── Update an existing event ──────────────────────────
    async update(id, data) {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            if (['title', 'description', 'event_date', 'event_end_date', 'event_time', 'event_end_time', 'location', 'priority', 'status'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return this.getById(id);

        values.push(id);
        await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values);
        return this.getById(id);
    },

    // ── Delete an event ───────────────────────────────────
    async delete(id) {
        const event = await this.getById(id);
        if (!event) return null;
        await pool.query('DELETE FROM events WHERE id = ?', [id]);
        return event;
    },

    // ── RSVP: add participant ─────────────────────────────
    async addParticipant(eventId, userId) {
        try {
            await pool.query(
                "INSERT INTO event_participants (event_id, user_id, rsvp_status) VALUES (?, ?, 'accepted')",
                [eventId, userId]
            );
            return true;
        } catch (err) {
            // Duplicate entry — user already registered
            if (err.code === 'ER_DUP_ENTRY') return false;
            throw err;
        }
    },

    // ── RSVP: remove participant ──────────────────────────
    async removeParticipant(eventId, userId) {
        const [result] = await pool.query(
            'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );
        return result.affectedRows > 0;
    },

    // ── RSVP: get all participants for an event ───────────
    async getParticipants(eventId) {
        const [rows] = await pool.query(`
      SELECT u.id, u.username, u.avatar_color, ep.rsvp_status, ep.joined_at
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.event_id = ?
      ORDER BY ep.joined_at ASC
    `, [eventId]);
        return rows;
    },

    // ── Check if a specific user is registered ────────────
    async isParticipant(eventId, userId) {
        const [rows] = await pool.query(
            'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ? LIMIT 1',
            [eventId, userId]
        );
        return rows.length > 0;
    },

    // ── Log a sync action ────────────────────────────────
    async logSync({ event_id, action, changed_data, performed_by }) {
        await pool.query(`
      INSERT INTO sync_log (event_id, action, changed_data, performed_by)
      VALUES (?, ?, ?, ?)
    `, [event_id, action, JSON.stringify(changed_data), performed_by || 1]);
    },

    // ── Get sync history ─────────────────────────────────
    async getSyncLog(limit = 20) {
        const [rows] = await pool.query(`
      SELECT sl.*, u.username AS performer_name
      FROM sync_log sl
      LEFT JOIN users u ON sl.performed_by = u.id
      ORDER BY sl.created_at DESC
      LIMIT ?
    `, [limit]);
        return rows;
    },

    // ── Automatic Status Transitions ──────────────────────
    async autoUpdateStatuses() {
        // 1. Move 'upcoming' to 'ongoing' if start time reached AND (no end time OR end time not yet reached)
        const [ongoingResult] = await pool.query(`
      UPDATE events 
      SET status = 'ongoing' 
      WHERE status = 'upcoming' 
        AND TIMESTAMP(event_date, event_time) <= NOW()
        AND (
          (event_end_date IS NULL AND (event_end_time IS NULL OR TIMESTAMP(event_date, event_end_time) > NOW())) OR
          (event_end_date IS NOT NULL AND TIMESTAMP(event_end_date, COALESCE(event_end_time, '23:59:59')) > NOW())
        )
    `);

        // 2. Move 'upcoming' or 'ongoing' to 'completed' if end time reached
        const [completedResult] = await pool.query(`
      UPDATE events 
      SET status = 'completed' 
      WHERE status IN ('upcoming', 'ongoing')
        AND (
          (event_end_date IS NOT NULL AND TIMESTAMP(event_end_date, COALESCE(event_end_time, '23:59:59')) <= NOW()) OR
          (event_end_date IS NULL AND event_end_time IS NOT NULL AND TIMESTAMP(event_date, event_end_time) <= NOW())
        )
    `);

        return ongoingResult.affectedRows > 0 || completedResult.affectedRows > 0;
    }
};

module.exports = EventModel;
