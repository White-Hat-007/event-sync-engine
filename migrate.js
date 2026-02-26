// Migration: ensure schema is up-to-date + seed admin account
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'dummyboi393@gmail.com';
const ADMIN_PASSWORD = 'Darshcc123!';
const ADMIN_USERNAME = 'Darsh';

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'event_sync_engine',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        multipleStatements: true
    });

    try {
        console.log('Connected to MySQL…');

        // 1. Add password_hash column if it doesn't exist
        await conn.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email
        `);
        console.log('✅  password_hash column ensured');

        // 2. Add role column if it doesn't exist
        await conn.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role ENUM('admin','user') DEFAULT 'user' AFTER password_hash
        `);
        console.log('✅  role column ensured');

        // 3. Create password_resets table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id          INT          AUTO_INCREMENT PRIMARY KEY,
                user_id     INT          NOT NULL,
                token       VARCHAR(255) NOT NULL UNIQUE,
                expires_at  DATETIME     NOT NULL,
                used        TINYINT(1)   DEFAULT 0,
                created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_reset_token (token)
            ) ENGINE=InnoDB
        `);
        console.log('✅  password_resets table ensured');

        // 4. Seed or update admin account
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const [admins] = await conn.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admins.length === 0) {
            await conn.query(
                "INSERT INTO users (username, email, password_hash, role, avatar_color) VALUES (?, ?, ?, 'admin', '#6C63FF')",
                [ADMIN_USERNAME, ADMIN_EMAIL, hash]
            );
            console.log(`✅  Admin account created  (${ADMIN_EMAIL})`);
        } else {
            // Update existing admin to new credentials
            await conn.query(
                "UPDATE users SET email = ?, password_hash = ?, username = ? WHERE id = ?",
                [ADMIN_EMAIL, hash, ADMIN_USERNAME, admins[0].id]
            );
            console.log(`✅  Admin account updated  (${ADMIN_EMAIL})`);
        }

        console.log('\n🎉  Migration complete!\n');
    } finally {
        await conn.end();
    }
}

migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
