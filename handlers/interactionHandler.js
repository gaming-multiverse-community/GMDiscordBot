const { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const db = require('../components/database');
const logging = require('../components/logging');
const rateLimiter = require('../components/rateLimiter');
const queue = require('../components/queue');
const config = require('../config.json'); // Import the config.json file

async function handleInteraction(interaction, client) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;  // Use isStringSelectMenu()

    const userId = interaction.user.id;

    // Rate limiting
    if (rateLimiter.isRateLimited(userId)) {
        return interaction.reply({ content: 'You are sending too many requests. Please slow down.', ephemeral: true });
    }

    if (interaction.customId === 'create_ticket') {
        // Show the dropdown menu when "Create Ticket" button is clicked
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_type')
            .setPlaceholder('Select a ticket type...')
            .addOptions(
                {
                    label: 'Support Ticket',
                    description: 'Open a support ticket',
                    value: 'support_ticket',
                },
                {
                    label: 'Sales Ticket',
                    description: 'Open a sales ticket',
                    value: 'sales_ticket',
                }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.reply({ content: 'Please choose a ticket type:', components: [row], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type') {  // Use isStringSelectMenu()
        const ticketType = interaction.values[0]; // Get the selected ticket type
        const member = interaction.member;

        db.getTicketCount(member.id, async (err, ticketRow) => {
            if (err) {
                console.error(err.message);
                return interaction.reply({ content: 'An error occurred while checking your tickets.', ephemeral: true });
            }

            if (ticketRow && ticketRow.ticket_count > 0) {
                return interaction.reply({ content: 'You can only have one active ticket at a time.', ephemeral: true });
            }

            // Determine the category ID based on the ticket type
            let categoryId;
            if (ticketType === 'support_ticket') {
                categoryId = config.categories.support;
            } else if (ticketType === 'sales_ticket') {
                categoryId = config.categories.sales;
            }

            // Create a ticket channel under the appropriate category
            const guild = interaction.guild;
            const channelName = `${ticketType}-${member.user.username}`;

            // Prepare the permissions for the channel
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                }
            ];

            // Add support roles specified in config.supportRoleIds to have access to the channel
            config.supportRoleIds.forEach(roleId => {
                permissionOverwrites.push({
                    id: roleId.trim(),
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                });
            });

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,  // Set the parent category
                permissionOverwrites: permissionOverwrites,
            });

            // Update ticket count in the database
            db.incrementTicketCount(member.id);

            // Create a log file path
            const logFilePath = `./logs/${channelName}.txt`;

            // Log the ticket type as the first entry in the log file
            const ticketTypeMessage = `Ticket Type: ${ticketType.replace('_', ' ')}\nCreated by: ${member.user.tag}\n\n`;
            queue.addToQueue(() => logging.appendToLog(logFilePath, ticketTypeMessage));

            // Send a message in the ticket channel with a close button
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle(ticketType.replace('_', ' ')) // Convert to readable title
                .setDescription('Support will assist you shortly. Click the button below to close this ticket.');

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger),
                );

            await ticketChannel.send({ content: `Hello ${member.user}, your ticket has been created!`, embeds: [embed], components: [actionRow] });

            await interaction.reply({ content: `Your ${ticketType.replace('_', ' ')} has been created! ${ticketChannel}`, ephemeral: true });

            // Listen for messages in the ticket channel and log them incrementally
            const collector = ticketChannel.createMessageCollector({ filter: m => !m.author.bot });

            collector.on('collect', message => {
                const logMessage = `${message.author.tag}: ${message.content}\n`;
                queue.addToQueue(() => logging.appendToLog(logFilePath, logMessage));
            });

            // Handle ticket closing
            client.on('interactionCreate', async interaction => {
                if (!interaction.isButton() || interaction.customId !== 'close_ticket' || interaction.channel.id !== ticketChannel.id) return;

                // Add closing message to log
                const closeMessage = `\nTicket closed by ${interaction.member.user.tag} at ${new Date().toLocaleString()}\n`;
                queue.addToQueue(() => logging.appendToLog(logFilePath, closeMessage));

                // Upload the log file to the specified channel and delete it afterward
                const userName = member.user.username;
                queue.addToQueue(() => logging.uploadAndDeleteLog(logFilePath, client.channels.cache.get(config.logChannelId), userName, ticketType));

                // Reset ticket count in the database
                db.resetTicketCount(member.id);

                await ticketChannel.send('This ticket will be closed in 5 seconds...');

                setTimeout(async () => {
                    await ticketChannel.delete();
                }, 5000);

                await interaction.reply({ content: 'Ticket closed!', ephemeral: true });
            });
        });
    }
}

module.exports = {
    handleInteraction
};
