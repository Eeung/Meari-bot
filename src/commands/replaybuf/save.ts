import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { createWavStream } from '@/audio/saveWav.js';
import { VoiceReceiverManager } from '@/audio/receiver.js';
import path from 'path';
import { formatTimestamp } from '@/utils/dateFormat.js';
import { createZipStream } from '@/storage/createZip.js';
import { createSignedUrl } from '@/server/signedUrl.js';
import printLog from '@/utils/printLog.js';
import { createDownloadMessage } from '@/utils/ImbededUrl.js';
import { MessageDataStore } from '@/storage/messageData.js';

const saving = new Set<string>();

const save: SubCommand = {
  data: new SlashCommandSubcommandBuilder()
  .setName('save')
    .setDescription('리플레이 버퍼 저장'),

  execute: async (interaction) => {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({content: 'DM에서는 사용할 수 없는 명령어입니다.', flags: MessageFlags.Ephemeral});
      return;
    }
    const guildChunks = VoiceReceiverManager.getGuildBuffers(guild.id);
    if (!guildChunks || guildChunks.size === 0) {
      await interaction.reply({content: '저장할 음성이 없습니다.', flags: MessageFlags.Ephemeral});
      return;
    }
    if (saving.has(guild.id)) {
      await interaction.reply({content: '이미 저장 중입니다. 잠시 후 다시 시도해주세요.', flags: MessageFlags.Ephemeral});
      return;
    }
    saving.add(guild.id);

    try{
      await interaction.deferReply();
      const ts = Date.now();
      const fileName = `${formatTimestamp(ts)} ${guild.name.replace(/[\\/:*?"<>|]/g, '_')}.zip`;

      const { zipfile, done } = createZipStream(path.join(process.cwd(), 'recordings', fileName));

      const members: string[] = [];      
      printLog("Saving started", `${guild.name}(${guild.id})`);
      const tasks = [...guildChunks.entries()].map(async ([userId, chunks]) => {
        try{
          const member = await guild.members.fetch(userId);
          const username = member.user.username.replace(/[\\/:*?"<>|]/g, '_');
          members.push(member.displayName);

          const wavStream = await createWavStream(chunks, ts);

          zipfile.addReadStream(wavStream!, `${username}.wav`);
        } catch(err){
          if (err instanceof Error)
            err.message = `{From ${userId}} ${err.message}`;
          throw err;
        }
      });
      const results = await Promise.allSettled(tasks);

      zipfile.end();
      await done;

      const token = createSignedUrl(fileName);
      const url = `${process.env.BASE_DOMAIN}/${token}`;

      const message = await interaction.editReply(createDownloadMessage(fileName, url, members));

      MessageDataStore.set(message.id, {
        channelId: message.channelId,
        fileName,
        createdAt: ts,
      })

      printLog("Saving finished", `${guild.name}(${guild.id})`);
      for (const result of results) 
        if (result.status === 'rejected') 
          printLog(`ERROR in ${guild.name}(${guild.id})`, `${result.reason}\n`);
    } finally {
      saving.delete(guild.id);
    }
  }
};

export default save;