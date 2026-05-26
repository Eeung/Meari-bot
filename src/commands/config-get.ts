import { SlashCommandBuilder,  } from 'discord.js';

import type { Command } from '@/commands/CommandTypes.js';
import get from './config/get.js';

const configGet: Command = {
  data: new SlashCommandBuilder()
    .setName('config-get')
    .setDescription('(멤버용)현재 설정 조회'),

  execute: get.execute,
};

export default configGet;