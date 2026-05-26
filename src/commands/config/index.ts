import get from './get.js';
import retention from './retention.js';
import record from './record.js';
import member from './member.js';
import { createSubCommandRouter } from '@/commands/CommandTypes.js';
import { PermissionFlagsBits } from 'discord.js';

export default createSubCommandRouter({
  name: 'config',
  description: '서버 설정',
  permission: PermissionFlagsBits.Administrator,
  subCommands: {
    get,
    retention,
    record,
    member,
  }
});