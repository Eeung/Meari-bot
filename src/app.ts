import 'dotenv/config';

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { commands } from './commands/index.js';
import { joinIfNeeded, setupAutoReplay } from './audio/voiceStateUpdate.js';
import { GuildConfigManager } from './storage/guildConfig.js';
import { AutoReplayState } from './audio/autoReplayState.js';
import { startCleanupScheduler } from '@/storage/cleanupScheduler.js';
import '@/server/server.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, (c) => {
  setupAutoReplay(client);
  startCleanupScheduler();
  console.log(`READY: ${c.user.tag}`);

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

  console.log('command received:', interaction.commandName);

  const command = commands[interaction.commandName];

  if (!command) return;
  await command.execute(interaction);
});

client.login(process.env.DISCORD_TOKEN);