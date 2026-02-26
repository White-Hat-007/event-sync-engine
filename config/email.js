// ─────────────────────────────────────────────────────────
// Email Utility — Nodemailer transport
// ─────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('⚠️  SMTP not configured — emails will be logged to console only.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
    });

    return transporter;
}

/**
 * Send an email. Falls back to console logging if SMTP is not configured.
 */
async function sendMail({ to, subject, html }) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@eventsync.local';
    const transport = getTransporter();

    if (!transport) {
        console.log('\n📧  EMAIL (console fallback — SMTP not configured):');
        console.log(`   To:      ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Body:    ${html.replace(/<[^>]+>/g, '')}\n`);
        return { consoleFallback: true };
    }

    const info = await transport.sendMail({ from, to, subject, html });
    console.log(`📧  Email sent to ${to} — messageId: ${info.messageId}`);
    return info;
}

module.exports = { sendMail };
