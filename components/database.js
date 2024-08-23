const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./tickets.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS embed_status (channel_id TEXT PRIMARY KEY, embed_created BOOLEAN DEFAULT 0)`);
        db.run(`CREATE TABLE IF NOT EXISTS tickets (user_id TEXT PRIMARY KEY, ticket_count INTEGER DEFAULT 0)`);
    }
});

function getEmbedStatus(channelId, callback) {
    db.get(`SELECT embed_created FROM embed_status WHERE channel_id = ?`, [channelId], callback);
}

function setEmbedStatus(channelId) {
    db.run(`INSERT INTO embed_status (channel_id, embed_created) VALUES (?, 1) ON CONFLICT(channel_id) DO UPDATE SET embed_created = 1`, [channelId]);
}

function getTicketCount(userId, callback) {
    db.get(`SELECT ticket_count FROM tickets WHERE user_id = ?`, [userId], callback);
}

function incrementTicketCount(userId) {
    db.run(`INSERT INTO tickets (user_id, ticket_count) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET ticket_count = ticket_count + 1`, [userId]);
}

function resetTicketCount(userId) {
    db.run(`UPDATE tickets SET ticket_count = 0 WHERE user_id = ?`, [userId]);
}

module.exports = {
    getEmbedStatus,
    setEmbedStatus,
    getTicketCount,
    incrementTicketCount,
    resetTicketCount
};
