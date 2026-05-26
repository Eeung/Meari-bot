import { SlashCommandBuilder, } from 'discord.js';
import type { Command } from '@/commands/CommandTypes.js';
import save from './replaybuf/save.js';

const replaybufSave: Command = {
  data: new SlashCommandBuilder()
    .setName('replaybuf-save')
    .setDescription('(멤버용)현재 음성 버퍼를 파일로 저장'),

  execute: save.execute,
};

export default replaybufSave;