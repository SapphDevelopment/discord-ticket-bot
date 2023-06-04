import { SubCommandInterface } from '../../typings/index';
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const command: SubCommandInterface = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Configure the ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('delete')
                .setDescription('Delete any data you want.')
                .addStringOption((options) =>
                    options
                        .setName('data')
                        .setDescription('Choose which kind of data you wanna delete')
                        .setChoices({ name: `Settings`, value: `settings` }, { name: `Tickets`, value: `tickets` })
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('setup')
                .setDescription('Setup the channels or roles for the ticket system')
                .addChannelOption((options) =>
                    options
                        .setName('channel')
                        .setDescription('The channel where people can interact with buttons to create a ticket')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addChannelOption((options) =>
                    options
                        .setName('transcript-channel')
                        .setDescription('The channel where all the ticket transcripts will be sent to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addChannelOption((options) =>
                    options
                        .setName('category')
                        .setDescription('The category where all tickets will be created under')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true),
                )
                .addRoleOption((options) =>
                    options
                        .setName('role')
                        .setDescription('The role to manage the tickets on the server')
                        .setRequired(true),
                )
                .addStringOption((options) =>
                    options
                        .setName('message')
                        .setDescription('The messsage people will see before creating a ticket')
                        .setRequired(false),
                ),
        ),
};
export default command;
