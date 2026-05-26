import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, SlashCommandSubcommandBuilder, type SlashCommandOptionsOnlyBuilder, type SlashCommandSubcommandsOnlyBuilder } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface SubCommand {
  data: SlashCommandSubcommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

type Options = {
  name: string;
  description: string;
  permission?: bigint;
  subCommands: Record<string, SubCommand>;
};

export function createSubCommandRouter({ name, description, subCommands, permission = PermissionFlagsBits.ViewChannel }: Options): Command {
  return {data: (() => {
    const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(permission);
    Object.values(subCommands).forEach(sub => builder.addSubcommand(sub.data));
    return builder;
  })(),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const sub = interaction.options.getSubcommand();
    const command = subCommands[sub];
    if (!command) return;
    await command.execute(interaction);
  }};
}