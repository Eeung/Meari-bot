import { ChatInputCommandInteraction, MessageFlags, SlashCommandSubcommandBuilder, VoiceStateManager } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { ServerConfigManager } from '@/storage/guildConfig.js';
import { AutoReplayState } from '@/audio/autoReplayState.js';
import { checkAndJoinIfNeeded } from '@/audio/voiceStateUpdate.js';
import { getVoiceConnection } from '@discordjs/voice';
import { VoiceReceiverManager } from '@/audio/receiver.js';

const toggle: SubCommand = {
  data: new SlashCommandSubcommandBuilder()
  .setName('toggle')
  .setDescription('리플레이 버퍼 활성화/비활성화'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({content: 'DM에서는 사용할 수 없는 명령어입니다.', flags: MessageFlags.Ephemeral});
      return;
    }

    const config = ServerConfigManager.get(guild.id);
    if(!config.enabledReplayBuffer){
      const channel = config.voiceChannelId;
      if (!channel) {
        await interaction.reply({ content: '녹음 채널을 설정하지 않았습니다.', flags: MessageFlags.Ephemeral });
        return;
      }

      checkAndJoinIfNeeded(guild);
      AutoReplayState.enable(guild.id);
      ServerConfigManager.set(guild.id, { enabledReplayBuffer: true });
      await interaction.reply('리플레이 버퍼가 활성화되었습니다.');
    } else{
      AutoReplayState.disable(guild.id);
      ServerConfigManager.set(guild.id, { enabledReplayBuffer: false });
      await interaction.reply('리플레이 버퍼가 비활성화됐습니다.');
      const connection = getVoiceConnection(guild.id);
      if (!connection) return;
      VoiceReceiverManager.stopListening(connection.receiver, guild);
      connection.destroy();
    }
  }
}

export default toggle;