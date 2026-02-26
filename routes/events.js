// ─────────────────────────────────────────────────────────
// Event Routes — REST API endpoints
// ─────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/eventController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Sync log must come before /:id to avoid route collision
router.get('/sync/log', ctrl.getSyncLog);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// ── Admin-only: create, update, delete ────────────────────
router.post('/', verifyToken, requireAdmin, ctrl.create);
router.put('/:id', verifyToken, requireAdmin, ctrl.update);
router.delete('/:id', verifyToken, requireAdmin, ctrl.delete);

// ── RSVP / Event Registration (any authenticated user) ────
router.post('/:id/rsvp', verifyToken, ctrl.rsvp);
router.delete('/:id/rsvp', verifyToken, ctrl.cancelRsvp);
router.get('/:id/participants', ctrl.getParticipants);

module.exports = router;
