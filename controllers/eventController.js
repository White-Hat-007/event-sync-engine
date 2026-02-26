// ─────────────────────────────────────────────────────────
// Event Controller — route handler logic
// ─────────────────────────────────────────────────────────
const EventModel = require('../models/eventModel');

// Helper: access the Socket.io instance attached to req.app
const broadcast = (req, eventName, payload) => {
    const io = req.app.get('io');
    if (io) io.emit(eventName, payload);
};

const EventController = {
    // ── GET  /api/events ──────────────────────────────────
    async getAll(req, res, next) {
        try {
            const events = await EventModel.getAll();
            res.json({ success: true, count: events.length, data: events });
        } catch (err) { next(err); }
    },

    // ── GET  /api/events/:id ──────────────────────────────
    async getById(req, res, next) {
        try {
            const event = await EventModel.getById(req.params.id);
            if (!event) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }
            res.json({ success: true, data: event });
        } catch (err) { next(err); }
    },

    // ── POST /api/events  (admin only — enforced by route middleware) ─
    async create(req, res, next) {
        try {
            const { title, event_date, event_time } = req.body;
            if (!title || !event_date || !event_time) {
                return res.status(400).json({ success: false, message: 'title, event_date, and event_time are required' });
            }

            const created_by = req.user.id;
            const newEvent = await EventModel.create({ ...req.body, created_by });

            await EventModel.logSync({
                event_id: newEvent.id,
                action: 'CREATE',
                changed_data: req.body,
                performed_by: created_by
            });

            broadcast(req, 'event:created', newEvent);
            res.status(201).json({ success: true, data: newEvent });
        } catch (err) { next(err); }
    },

    // ── PUT  /api/events/:id  (admin only) ────────────────
    async update(req, res, next) {
        try {
            const existing = await EventModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }

            const updated = await EventModel.update(req.params.id, req.body);

            await EventModel.logSync({
                event_id: updated.id,
                action: 'UPDATE',
                changed_data: req.body,
                performed_by: req.user.id
            });

            broadcast(req, 'event:updated', updated);
            res.json({ success: true, data: updated });
        } catch (err) { next(err); }
    },

    // ── DELETE /api/events/:id  (admin only) ──────────────
    async delete(req, res, next) {
        try {
            const existing = await EventModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }

            await EventModel.logSync({
                event_id: existing.id,
                action: 'DELETE',
                changed_data: { title: existing.title },
                performed_by: req.user.id
            });

            await EventModel.delete(req.params.id);
            broadcast(req, 'event:deleted', { id: existing.id });
            res.json({ success: true, data: existing });
        } catch (err) { next(err); }
    },

    // ── POST /api/events/:id/rsvp  (any authenticated user) ─
    async rsvp(req, res, next) {
        try {
            const event = await EventModel.getById(req.params.id);
            if (!event) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }
            if (event.status === 'cancelled') {
                return res.status(400).json({ success: false, message: 'Cannot register for a cancelled event.' });
            }
            if (event.status === 'completed') {
                return res.status(400).json({ success: false, message: 'This event has already ended.' });
            }

            const result = await EventModel.addParticipant(event.id, req.user.id);
            if (!result) {
                return res.status(409).json({ success: false, message: 'You are already registered for this event.' });
            }

            const participants = await EventModel.getParticipants(event.id);
            broadcast(req, 'event:rsvpUpdate', { eventId: event.id, participants });

            res.status(201).json({ success: true, message: 'Successfully registered for the event.', participants });
        } catch (err) { next(err); }
    },

    // ── DELETE /api/events/:id/rsvp  (cancel own registration) ─
    async cancelRsvp(req, res, next) {
        try {
            const event = await EventModel.getById(req.params.id);
            if (!event) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }

            const removed = await EventModel.removeParticipant(event.id, req.user.id);
            if (!removed) {
                return res.status(404).json({ success: false, message: 'You are not registered for this event.' });
            }

            const participants = await EventModel.getParticipants(event.id);
            broadcast(req, 'event:rsvpUpdate', { eventId: event.id, participants });

            res.json({ success: true, message: 'Registration cancelled.', participants });
        } catch (err) { next(err); }
    },

    // ── GET /api/events/:id/participants ───────────────────
    async getParticipants(req, res, next) {
        try {
            const participants = await EventModel.getParticipants(req.params.id);
            res.json({ success: true, data: participants });
        } catch (err) { next(err); }
    },

    // ── GET  /api/events/sync/log ─────────────────────────
    async getSyncLog(req, res, next) {
        try {
            const logs = await EventModel.getSyncLog();
            res.json({ success: true, data: logs });
        } catch (err) { next(err); }
    }
};

module.exports = EventController;
