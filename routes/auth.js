// ─────────────────────────────────────────────────────────
// Auth Routes
// ─────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', verifyToken, AuthController.me);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/users', verifyToken, requireAdmin, AuthController.getAllUsers);

module.exports = router;
