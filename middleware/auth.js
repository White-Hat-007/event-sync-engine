// ─────────────────────────────────────────────────────────
// Auth Middleware — JWT verification + role guards
// ─────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

// ── Verify JWT token ──────────────────────────────────────
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username, email, role }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
}

// ── Require admin role ────────────────────────────────────
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}

module.exports = { verifyToken, requireAdmin };
