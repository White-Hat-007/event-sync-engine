// ─────────────────────────────────────────────────────────
// MySQL Connection Pool (mysql2/promise)
// ─────────────────────────────────────────────────────────
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_sync_engine',
  port:     parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

// Quick connectivity check on startup
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected — database:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
  });

module.exports = pool;
