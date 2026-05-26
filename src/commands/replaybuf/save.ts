import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { SubCommand } from '@/commands/CommandTypes.js';
import { createWavStream as createWavStream } from '@/audio/saveWav.js';
import { VoiceReceiverManager } from '@/audio/receiver.js';
import path from 'path';
import { formatTimestamp } from '@/utils/dateFormat.js';
import { createZipStream } from '@/storage/createZip.js';
import { createSignedUrl } from '@/storage/signedUrl.js';

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

    const guildChunks = VoiceReceiverManager.getServerBuffers(guild.id);
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
      const fileName = `${guild.id}_${formatTimestamp(ts)}.zip`;

      const { zipfile, done } = createZipStream(path.join(process.cwd(), 'recordings', fileName));

      console.log('저장 시작');
      const tasks = [...guildChunks.entries()].map(async ([userId, chunks]) => {
        const member = await guild.members.fetch(userId);
        const username = member.user.username.replace(/[\\/:*?"<>|]/g, '_');

        const wavStream = await createWavStream(chunks, ts);

        zipfile.addReadStream(wavStream!, `${username}.wav`);
      });
      const results = await Promise.allSettled(tasks);

      zipfile.end();
      await done;

      const token = createSignedUrl(encodeURIComponent(fileName));
      const url = `${process.env.BASE_DOMAIN}/${token}`;

      await interaction.editReply(`다운로드 링크: <${url}>`);

      for (const result of results) 
        if (result.status === 'rejected') 
          console.error(result.reason);
    } finally {
      saving.delete(guild.id);
    }
  }
};

export default save;