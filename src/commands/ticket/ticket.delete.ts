import { DiscordClient } from '../../bot.js';
import { SubCommand } from '../../typings/index';
import { ChatInputCommandInteraction } from 'discord.js';

const command: SubCommand = {
    subCommand: 'ticket.delete',
    execute: async (interaction: ChatInputCommandInteraction, client: DiscordClient) => {
        const { options, guild } = interaction;
        const data = options.getString('data');
        if (!guild) return;

        const settings = await client.db.guild.findUnique({ where: { guildId: guild.id } });
        switch (data) {
            case 'settings': {
                if (!settings)
                    return interaction.reply({
                        content: `${client.config.emojis.error} Oh no! I cannot delete anything that doesn't exist:(`,
                        ephemeral: true,
                    });

                await client.db.guild.delete({ where: { guildId: guild.id } });

                return interaction.reply({
                    content: `${client.config.emojis.success} Successfully deleted settings for **${guild.name}**`,
                    ephemeral: true,
                });
            }
            case 'tickets': {
                await client.db.tickets.deleteMany({ where: { guildId: guild.id } });

                return interaction.reply({
                    content: `${client.config.emojis.success} Successfully deleted all tickets for guild: **${guild.name}**`,
                    ephemeral: true,
                });
            }
        }
    },
};
export default command;
