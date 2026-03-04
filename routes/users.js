// ─────────────────────────────────────────────────────────
// User Routes — Admin user management
// ─────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const UserModel = require('../models/userModel');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Helper: access the Socket.io instance attached to req.app
const broadcast = (req, eventName, payload) => {
    const io = req.app.get('io');
    if (io) io.emit(eventName, payload);
};

// ── GET /api/users — list all users (admin only) ─────────
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const users = await UserModel.getAll();
        res.json({ success: true, data: users });
    } catch (err) { next(err); }
});

// ── PUT /api/users/:id/role — update user role (admin only)
router.put('/:id/role', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { role } = req.body;
        const targetId = parseInt(req.params.id, 10);

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be "admin" or "user".' });
        }

        // Prevent admin from demoting themselves
        if (targetId === req.user.id && role !== 'admin') {
            return res.status(400).json({ success: false, message: 'You cannot remove your own admin role.' });
        }

        const user = await UserModel.findById(targetId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const updated = await UserModel.updateRole(targetId, role);

        // Broadcast role change so UI updates live (permissions, list, etc)
        broadcast(req, 'role-synced', { userId: targetId, newRole: role });

        res.json({ success: true, data: updated });
    } catch (err) { next(err); }
});

// ── GET /api/users/:id/registrations — list user's events (admin only)
router.get('/:id/registrations', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        const registrations = await UserModel.getRegistrations(targetId);
        res.json({ success: true, data: registrations });
    } catch (err) { next(err); }
});

module.exports = router;
