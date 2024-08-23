const fs = require('fs').promises;

async function appendToLog(filePath, message) {
    try {
        await fs.appendFile(filePath, message);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
}

async function uploadAndDeleteLog(logFilePath, logChannel, userName, ticketType) {
    try {
        await logChannel.send({
            content: `Ticket log for ${ticketType} - ${userName}`,
            files: [logFilePath],
        });
        await fs.unlink(logFilePath);
    } catch (error) {
        console.error('Error uploading or deleting log file:', error);
    }
}


module.exports = {
    appendToLog,
    uploadAndDeleteLog
};
