import 'dotenv/config';

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { commands } from './commands/index.js';
import { joinIfNeeded, setupAutoReplay } from './audio/voiceStateUpdate.js';
import { GuildConfigManager } from './storage/guildConfig.js';
import { AutoReplayState } from './audio/autoReplayState.js';
import { startCleanupScheduler } from '@/storage/cleanupScheduler.js';
import '@/server/server.js';
import printLog from './utils/printLog.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, (c) => {
  setupAutoReplay(client);
  startCleanupScheduler(client);
  printLog("READY", c.user.tag);

  for (const guildId of GuildConfigManager.getAllGuildIds()) {
    const config = GuildConfigManager.get(guildId);
    if (!config.enabledReplayBuffer) continue;

    const guild = client.guilds.cache.get(guildId);
    if(!guild) return;
    AutoReplayState.enable(guildId);
    joinIfNeeded(guild);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  printLog("Command received", `${interaction.commandName} from ${interaction.guild?.name}(${interaction.guild?.id})`);

  const command = commands[interaction.commandName];

  if (!command) return;
  await command.execute(interaction);
});

client.login(process.env.DISCORD_TOKEN);