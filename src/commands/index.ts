import replaybuf from './replaybuf/index.js';
import config from './config/index.js';
import configGet from './config-get.js';
import replaybufSave from './replaybuf-save.js';

import exit from './exit.js'

import type { Command } from './CommandTypes.js';

export const commands: Record<string, Command> = {
  replaybuf,
  config,
  'config-get': configGet,
  'replaybuf-save': replaybufSave,
  // exit,
};