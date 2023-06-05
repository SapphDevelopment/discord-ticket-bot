import { DiscordClient } from '../../bot.js';
import { EventInterface } from '../../typings/index';
import {
    Events,
    ButtonInteraction,
    PermissionFlagsBits,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message,
    Role,
    ChannelType,
    roleMention,
    userMention,
    channelMention,
} from 'discord.js';
import { ExportReturnType, createTranscript } from 'discord-html-transcripts';
import { nanoid } from 'nanoid';

const event: EventInterface = {
    name: Events.InteractionCreate,
    options: { once: false, rest: false },
    execute: async (interaction: ButtonInteraction, client: DiscordClient) => {
        if (!interaction.isButton()) return;

        const { guild, channel, customId } = interaction;
        const member = await guild?.members.fetch(interaction.member?.user.id!);
        if (!member) return;
        if (!guild) return;
        if (!channel) return;

        const settings = await client.db.guild.findUnique({ where: { guildId: guild.id } });
        const tickets = await client.db.tickets.findUnique({ where: { channelId: channel.id } });
        const ticketId = nanoid(10);
        if (!settings)
            return interaction.reply({
                content: `${client.config.emojis.error} Oh no! The data to create a ticket couldn't be found!`,
                ephemeral: true,
            });

        if (customId === 'createTicket') {
            const existingTicket = await client.db.tickets.findFirst({
                where: {
                    guildId: guild.id,
                    ownerId: member.id,
                },
            });
            if (existingTicket)
                return interaction.reply({
                    content: `${client.config.emojis.error} Oh no! You already have a open ticket!`,
                    ephemeral: true,
                });

            await guild.channels
                .create({
                    name: `ticket-${member.user.tag}`,
                    topic: `**User**: ${userMention(member.id)}\n**Ticket ID**: ${ticketId}`,
                    parent: settings.category,
                    type: ChannelType.GuildText,
                    rateLimitPerUser: 2,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.ReadMessageHistory,
                            ],
                        },
                        {
                            id: settings.supportRole,
                            allow: [
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageMessages,
                            ],
                        },
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: client.user?.id!,
                            allow: [
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageMessages,
                            ],
                        },
                    ],
                })
                .then(async (channel: TextChannel) => {
                    await client.db.tickets.create({
                        data: {
                            guildId: guild.id,
                            channelId: channel.id,
                            ticketId: ticketId,
                            ownerId: member.id,
                            closed: false,
                        },
                    });

                    channel
                        .send({
                            content: [
                                `# ${guild.name} | Ticket`,
                                `## What can you do while waiting for a ${roleMention(settings.supportRole)}:`,
                                `- Provide a reason for this ticket.`,
                                `- Provide as much detail as possible for this ticket.`,
                                `### Ticket ID: ${ticketId}`,
                            ].join('\n'),
                            components: [
                                new ActionRowBuilder<ButtonBuilder>().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('closeTicket')
                                        .setDisabled(false)
                                        .setEmoji(client.config.emojis.ticketClose)
                                        .setLabel('Close Ticket')
                                        .setStyle(ButtonStyle.Secondary),
                                ),
                            ],
                        })
                        .then(async (message: Message) => {
                            await message.pin('Ticket starter message');
                        });

                    await interaction.reply({
                        content: `${client.config.emojis.success} Successfully created your ticket: ${channelMention(
                            channel.id,
                        )}`,
                        ephemeral: true,
                    });
                });
        }
        if (customId === 'closeTicket') {
            if (!member.roles.cache.find((r: Role) => r.id === settings.supportRole))
                return interaction.reply({
                    content: `${client.config.emojis.error} Sorry, you are not allowed to use this action!`,
                    ephemeral: true,
                });

            if (tickets?.closed === true)
                return interaction.reply({
                    content: `${client.config.emojis.error} Sorry, this ticket is already closed:(`,
                    ephemeral: true,
                });

            const transcriptChannel = guild.channels.cache.get(settings.transcriptChannel) as TextChannel;
            const transcript = await createTranscript(channel, {
                limit: -1,
                returnType: ExportReturnType.Attachment,
                filename: `transcript-${ticketId}.html`,
                saveImages: true,
                footerText: 'Exported {number} message{s}',
                poweredBy: true,
            });

            await client.db.tickets.update({ where: { channelId: channel.id }, data: { closed: true } });
            await channel
                .send({
                    content: `${client.config.emojis.error} This ticket has been closed and will be deleted in 10 seconds!`,
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('userAction')
                                .setDisabled(true)
                                .setLabel(`Action by ${member.user.username}`)
                                .setStyle(ButtonStyle.Secondary),
                        ),
                    ],
                })
                .then(() => {
                    transcriptChannel.send({
                        content: [
                            `# Transcript - ${ticketId}`,
                            `## Ticket Owner:`,
                            `- ${userMention(member.id)}`,
                            `- ${member.user.tag}`,
                            `- ${member.id}`,
                            `## Ticket Closer:`,
                            `- ${userMention(interaction.user.id)}`,
                            `- ${interaction.user.tag}`,
                            `- ${interaction.user.id}`,
                        ].join('\n'),
                        files: [transcript],
                    });

                    interaction.reply({
                        content: `${client.config.emojis.success} Successfully closed the ticket!`,
                        ephemeral: true,
                    });

                    setTimeout(async () => {
                        await client.db.tickets.delete({ where: { channelId: channel.id } });
                        channel.delete(`Ticket has been closed.`).catch(() => {
                            channel.send(
                                `${client.config.emojis.error} Oh no! This channel couldn't be deleted! Please delete the channel manuely`,
                            );
                        });
                    }, 10 * 1000);
                });
        }
    },
};

export default event;
