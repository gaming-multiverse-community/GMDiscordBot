const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType  } = require('discord.js');
const interactionHandler = require('./handlers/interactionHandler');
const WelcomeNewMember = require('./handlers/welcomeHandler');
const db = require('./components/database');
const config = require('./config.json'); // Import the config.json file
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

client.once('ready', () => {
    const ticketChannelId = config.ticketChannelId;

    console.log(`Logged in as ${client.user.tag}`);
    
    client.user.setActivity('the cfx community', {
        type: ActivityType.Competing
    });

    client.user.setStatus('dnd');

    db.getEmbedStatus(ticketChannelId, async (err, row) => {
        if (err) {
            console.error('Error checking embed status:', err.message);
            return;
        }

        if (!row || !row.embed_created) {
            const ticketChannel = client.channels.cache.get(ticketChannelId);

            if (ticketChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('Support Tickets')
                    .setDescription('Click the button below to create a ticket.');

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('create_ticket')
                            .setLabel('Create Ticket')
                            .setStyle(ButtonStyle.Primary),
                    );

                await ticketChannel.send({ embeds: [embed], components: [actionRow] });

                db.setEmbedStatus(ticketChannelId);
                console.log('Embed created and status saved in the database.');
            } else {
                console.error('Ticket channel not found.');
            }
        } else {
            console.log('Embed already created, skipping creation.');
        }
    });
});

client.on('guildMemberAdd', async (member) => {
    await WelcomeNewMember.WelcomeNewMember(client, member);
});


client.on('interactionCreate', async interaction => {
    await interactionHandler.handleInteraction(interaction, client);
});

client.login(process.env.DISCORD_TOKEN);
