import { DiscordClient } from '../../bot.js';
import { SubCommand } from '../../typings/index';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CategoryChannel,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Role,
    TextChannel,
} from 'discord.js';

const command: SubCommand = {
    subCommand: 'ticket.setup',
    execute: async (interaction: ChatInputCommandInteraction, client: DiscordClient) => {
        const { options, guild } = interaction;
        const getMessage = options.getString('message') || ('Press 📩 to Create a Ticket' as String);
        let message = getMessage
            .replaceAll('{guild.name}', guild!.name)
            .replaceAll('{guild.id}', guild!.id)
            .replaceAll('{guild.description}', guild!.description!);
        const channel = options.getChannel('channel') as TextChannel;
        const transcriptChannel = options.getChannel('transcript-channel') as TextChannel;
        const category = options.getChannel('category') as CategoryChannel;
        const role = options.getRole('role') as Role;
        if (!guild) return;
        if (!channel) return;
        if (!transcriptChannel) return;
        if (!role) return;

        try {
            await client.db.guild.upsert({
                where: { guildId: guild?.id as string },
                create: {
                    guildId: guild.id as string,
                    channel: channel.id as string,
                    transcriptChannel: transcriptChannel.id as string,
                    category: category.id,
                    supportRole: role.id as string,
                },
                update: {
                    channel: channel.id as string,
                    transcriptChannel: transcriptChannel.id as string,
                    category: category.id,
                    supportRole: role.id as string,
                },
            });

            channel
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.config.colors.theme)
                            .setTitle(`${guild.name} | Ticket`)
                            .setDescription(`${message}`),
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('createTicket')
                                .setDisabled(false)
                                .setEmoji(client.config.emojis.ticketCreate)
                                .setStyle(ButtonStyle.Secondary),
                        ),
                    ],
                })
                .then(() => {
                    return interaction.reply({
                        content: `${client.config.emojis.success} Successfully created the ticket system.`,
                        ephemeral: true,
                    });
                });
        } catch (error) {
            console.error(error);
        }
    },
};
export default command;
