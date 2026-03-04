// ─────────────────────────────────────────────────────────
// Auth Controller — register, login, me, forgot/reset
// ─────────────────────────────────────────────────────────
const crypto = require('crypto');
const dns = require('dns');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const pool = require('../config/db');
const { sendMail } = require('../config/email');

const resolveMx = promisify(dns.resolveMx);
const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 30;

function signToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Helper: access the Socket.io instance attached to req.app
const broadcast = (req, eventName, payload) => {
    const io = req.app.get('io');
    if (io) io.emit(eventName, payload);
};

const AuthController = {
    // ── POST /api/auth/register ───────────────────────────
    async register(req, res) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ success: false, message: 'username, email, and password are required.' });
            }
            const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!EMAIL_RE.test(email)) {
                return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
            }

            // Verify the email domain has MX records (can actually receive mail)
            const domain = email.split('@')[1];
            try {
                const mxRecords = await resolveMx(domain);
                if (!mxRecords || mxRecords.length === 0) {
                    return res.status(400).json({ success: false, message: 'This email domain cannot receive emails. Please use a valid email address.' });
                }
            } catch (dnsErr) {
                return res.status(400).json({ success: false, message: 'This email domain does not exist. Please use a valid email address.' });
            }

            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
            }

            const existingEmail = await UserModel.findByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
            }

            const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
            const user = await UserModel.create({ username, email, password_hash, role: 'user' });

            // Broadcast new user creation for admin view live update
            broadcast(req, 'user:registered', _sanitize(user));

            // Send welcome email — awaited in its own try/catch so errors
            // are visible in the terminal without blocking the response
            try {
                await sendMail({
                    to: email,
                    subject: '🎉 Welcome to EventSyncEngine!',
                    html: `
                    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#0d0f1a;border:1px solid rgba(108,99,255,0.25);border-radius:16px;overflow:hidden;">
                      <div style="background:linear-gradient(135deg,#6C63FF,#FF6584);padding:2rem;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:800;">EventSync<span style="opacity:0.85;">Engine</span></h1>
                        <p style="color:rgba(255,255,255,0.8);margin:0.4rem 0 0;font-size:0.875rem;">Real-Time Collaborative Dashboard</p>
                      </div>
                      <div style="padding:2rem;">
                        <h2 style="color:#f1f5f9;margin:0 0 0.75rem;font-size:1.15rem;">Hey ${username}, welcome aboard! 👋</h2>
                        <p style="color:#94a3b8;margin:0 0 1.25rem;line-height:1.6;">Your account has been created successfully. You can now log in and start discovering, creating, and joining events in real time.</p>
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}"
                           style="display:inline-block;background:linear-gradient(135deg,#6C63FF,#8B7CF6);color:#fff;text-decoration:none;padding:0.75rem 1.75rem;border-radius:10px;font-weight:600;font-size:0.9rem;">
                           Go to Dashboard →
                        </a>
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:1.75rem 0;" />
                        <p style="color:#475569;font-size:0.78rem;margin:0;">If you didn't create this account, please ignore this email.</p>
                      </div>
                    </div>`
                });
                console.log(`📧  Welcome email sent to ${email}`);
            } catch (mailErr) {
                console.error('⚠️  Welcome email failed:', mailErr.message);
                console.error('    Full error:', JSON.stringify({ code: mailErr.code, command: mailErr.command, response: mailErr.response, responseCode: mailErr.responseCode }, null, 2));
            }

            res.status(201).json({ success: true, message: 'Account created successfully.', user: _sanitize(user) });
        } catch (err) {
            console.error('Register error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
            }
            res.status(500).json({ success: false, message: 'Server error during registration.' });
        }
    },

    // ── POST /api/auth/login ──────────────────────────────
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'email and password are required.' });
            }

            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }

            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }

            const token = signToken(user);
            res.json({ success: true, token, user: _sanitize(user) });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    },

    // ── GET /api/auth/me (protected) ─────────────────────
    async me(req, res) {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
            res.json({ success: true, user: _sanitize(user) });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    },

    // ── POST /api/auth/forgot-password ────────────────────
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required.' });
            }

            const user = await UserModel.findByEmail(email);

            // Always respond with success to prevent email enumeration
            if (!user) {
                return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
            }

            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

            // Invalidate any previous unused tokens for this user
            await pool.query(
                'UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0',
                [user.id]
            );

            // Store the token
            await pool.query(
                'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
                [user.id, token, expiresAt]
            );

            // Build reset URL
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;

            // Send email
            await sendMail({
                to: user.email,
                subject: 'Password Reset — EventSyncEngine',
                html: `
                    <div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:0 auto;background:#111827;border-radius:16px;padding:2rem;color:#e2e8f0;">
                        <div style="text-align:center;margin-bottom:1.5rem;">
                            <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#6C63FF,#FF6584);border-radius:12px;line-height:48px;font-size:24px;color:#fff;">⏱</div>
                            <h2 style="margin:0.75rem 0 0.25rem;color:#f1f5f9;font-size:1.3rem;">EventSync<span style="color:#6C63FF;">Engine</span></h2>
                        </div>
                        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;">
                            Hi <strong style="color:#f1f5f9;">${user.username}</strong>,<br><br>
                            We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>${RESET_TOKEN_EXPIRY_MINUTES} minutes</strong>.
                        </p>
                        <div style="text-align:center;margin:1.75rem 0;">
                            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6C63FF,#818cf8);color:#fff;padding:0.85rem 2rem;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.95rem;box-shadow:0 4px 20px rgba(108,99,255,0.35);">
                                Reset My Password
                            </a>
                        </div>
                        <p style="color:#64748b;font-size:0.78rem;line-height:1.5;">
                            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.<br><br>
                            <span style="color:#475569;">If the button doesn't work, copy this link:</span><br>
                            <a href="${resetUrl}" style="color:#6C63FF;word-break:break-all;">${resetUrl}</a>
                        </p>
                    </div>
                `
            });

            res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
        } catch (err) {
            console.error('Forgot password error:', err);
            res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
        }
    },

    // ── POST /api/auth/reset-password ─────────────────────
    async resetPassword(req, res) {
        try {
            const { token, password } = req.body;

            if (!token || !password) {
                return res.status(400).json({ success: false, message: 'Token and new password are required.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
            }

            // Find the token in the database
            const [rows] = await pool.query(
                'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1',
                [token]
            );

            if (rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
            }

            const resetRecord = rows[0];

            // Update the user's password
            const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
            await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, resetRecord.user_id]);

            // Mark token as used
            await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

            res.json({ success: true, message: 'Password has been reset successfully. You can now sign in.' });
        } catch (err) {
            console.error('Reset password error:', err);
            res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
        }
    },

    // ── GET /api/auth/users (admin only) ──────────────────
    async getAllUsers(req, res) {
        try {
            const [users] = await pool.query(
                'SELECT id, username, email, role, avatar_color, created_at FROM users ORDER BY created_at ASC'
            );
            const [rsvps] = await pool.query(`
                SELECT ep.user_id, e.id AS event_id, e.title, e.event_date, e.event_time, e.status
                FROM event_participants ep
                JOIN events e ON ep.event_id = e.id
                ORDER BY e.event_date ASC
            `);
            const eventsByUser = {};
            for (const row of rsvps) {
                if (!eventsByUser[row.user_id]) eventsByUser[row.user_id] = [];
                eventsByUser[row.user_id].push({
                    id: row.event_id,
                    title: row.title,
                    event_date: row.event_date,
                    event_time: row.event_time,
                    status: row.status
                });
            }
            const result = users.map(u => ({ ...u, registered_events: eventsByUser[u.id] || [] }));
            res.json({ success: true, data: result });
        } catch (err) {
            console.error('getAllUsers error:', err);
            res.status(500).json({ success: false, message: 'Server error.' });
        }
    }
};

// Strip password_hash before sending to client
function _sanitize(user) {
    if (!user) return user;
    const { password_hash, ...safe } = user;
    return safe;
}

module.exports = AuthController;
