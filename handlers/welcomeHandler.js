const { welcomeChannelId, welcomeMessages } = require('../config.json');

async function WelcomeNewMember(client, member) {
    try {
        const channel = await client.channels.fetch(welcomeChannelId);

        const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
            .replace('${member}', `<@${member.id}>`); // Mention the user

        setTimeout(() => {
            channel.send(welcomeMessage)
                .then(() => console.log('Welcome message sent successfully'))
                .catch(err => console.error('Error sending welcome message:', err));
        }, 1000);
    } catch (error) {
        console.error('Failed to send welcome message:', error);
    }
}

module.exports = { WelcomeNewMember };
