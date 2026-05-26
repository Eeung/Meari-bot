import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from './CommandTypes.js';

const exit: Command = {
  data: new SlashCommandBuilder()
    .setName('exit')
    .setDescription('봇 종료')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply('봇 종료');
    interaction.client.destroy();
    process.exit(0);
  }
}

export default exit;