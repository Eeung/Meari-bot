import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { GuildConfigManager } from '@/storage/guildConfig.js';
import { joinIfNeeded } from '@/audio/voiceStateUpdate.js';

const record: SubCommand = {
  data: new SlashCommandSubcommandBuilder()
  .setName('member')
  .setDescription('봇 참가 기준 인원 수')
    .addIntegerOption(opt => opt
      .setName('count')
      .setDescription('인원 수(0: 항상)')
      .setMinValue(0)
      .setRequired(true)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({content: 'DM에서는 사용할 수 없는 명령어입니다.', flags: MessageFlags.Ephemeral});
      return;
    }
    const count = interaction.options.getInteger('count', true);

    GuildConfigManager.set(guild.id, {
      autoJoinThreshold: count
    });

    await interaction.reply(`기준 인원 수가 ${count}명으로 설정되었습니다.`);
    joinIfNeeded(guild)
  }
};

export default record;