// ─────────────────────────────────────────────────────────
// Server Entry Point — Express + Socket.io
// ─────────────────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const eventRoutes = require('./routes/events');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');
const syncHandler = require('./sockets/syncHandler');
const statusWorker = require('./sockets/statusWorker');

// ── App & Server ────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Store io instance so controllers can broadcast
app.set('io', io);

// ── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// ── Error Handler (must be last) ────────────────────────
app.use(errorHandler);

// ── WebSocket Handler ───────────────────────────────────
syncHandler(io);
statusWorker(io);

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀  Server running at  http://localhost:${PORT}`);
    console.log(`📡  WebSocket ready    ws://localhost:${PORT}`);
    console.log(`📂  Serving frontend   ${path.join(__dirname, 'public')}\n`);
});
