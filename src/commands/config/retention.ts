import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { ServerConfigManager } from '@/storage/guildConfig.js';

const retention: SubCommand = {
  data: new SlashCommandSubcommandBuilder()
  .setName('retention')
  .setDescription('버퍼 유지 시간 설정')
  .addIntegerOption(opt => opt
    .setName('seconds')
    .setDescription('유지 시간(초)')
    .setRequired(true)
  ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({content: 'DM에서는 사용할 수 없는 명령어입니다.', flags: MessageFlags.Ephemeral});
      return;
    }
    const seconds = interaction.options.getInteger('seconds', true);
      
    ServerConfigManager.set(guild.id, {
      bufferRetentionTime: seconds * 1000
    });

    await interaction.reply(`버퍼 유지 시간이 ${seconds}초로 설정되었습니다.`);
  }
};

export default retention;