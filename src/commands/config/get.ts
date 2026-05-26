import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { GuildConfigManager } from '@/storage/guildConfig.js';

const get: SubCommand = {
  data: new SlashCommandSubcommandBuilder()
  .setName('get')
  .setDescription('현재 설정 조회'),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({content: 'DM에서는 사용할 수 없는 명령어입니다.', flags: MessageFlags.Ephemeral});
      return;
    }
    const config = GuildConfigManager.get(guild.id);
    
    await interaction.reply({
      content:
        `녹음 채널: ${config.voiceChannelId}\n` +
        `버퍼 유지 시간: ${Math.round(config.bufferRetentionTime/1000)}초\n` +
        `봇 참여 기준 인원 수: ${config.autoJoinThreshold}명\n` +
        `리플레이 버퍼: ${config.enabledReplayBuffer ? "" : "비"}활성화`,
      flags: MessageFlags.Ephemeral
    });
  }
};

export default get;