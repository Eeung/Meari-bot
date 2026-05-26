import { ChannelType, MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { ServerConfigManager } from '@/storage/guildConfig.js';
import { checkAndJoinIfNeeded } from '@/audio/voiceStateUpdate.js';

const record: SubCommand = {
  data: new SlashCommandSubcommandBuilder()
  .setName('record')
  .setDescription('녹음 대상 음성 채널 설정')
  .addChannelOption(opt => opt
    .setName('channel')
    .setDescription('음성 채널')
    .addChannelTypes(ChannelType.GuildVoice)
    .setRequired(true)
  ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({content: 'DM에서는 사용할 수 없는 명령어입니다.', flags: MessageFlags.Ephemeral});
      return;
    }
    const channel = interaction.options.getChannel('channel', true);

    ServerConfigManager.set(guild.id, {
      voiceChannelId: channel.id
    });

    await interaction.reply(`녹음 음성 채널이 ${channel.name}(으)로 설정되었습니다.`);
    checkAndJoinIfNeeded(guild);
  }
};

export default record;