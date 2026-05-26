import { joinVoiceChannel, getVoiceConnection, VoiceConnection } from '@discordjs/voice';
import { ServerConfigManager } from '@/storage/guildConfig.js';
import { VoiceReceiverManager } from '@/audio/receiver.js';
import type { Client, Guild, VoiceBasedChannel } from 'discord.js';
import { AutoReplayState } from './autoReplayState.js';
import { Mutex } from 'async-mutex';

const guildMutex = new Map<string, Mutex>();

export function setupAutoReplay(client: Client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    let channel = newState.channel ?? oldState.channel!;
    // console.log('from', oldState.channel?.id, 'to', newState.channel?.id);

    const guild = channel.guild;

    const state = AutoReplayState.isEnabled(guild.id);
    if (!state) return;

    const connection = getVoiceConnection(guild.id);
    const config = ServerConfigManager.get(guild.id);
    // console.log('destination: ', config.voiceChannelId, 'current: ', channel.id);
    if (config.voiceChannelId !== channel.id) {
      channel = guild.channels.cache.get(config.voiceChannelId!) as VoiceBasedChannel;
    }

    // 사람 수 계산
    const humanCount = channel.members.filter(m => !m.user.bot).size;
    if (humanCount < config.autoJoinThreshold && connection)
      await leaveChannel(connection, guild);
    else if (humanCount >= config.autoJoinThreshold && !connection)
      await joinChannel(guild, channel);
  });
}

export function checkAndJoinIfNeeded(guild: Guild) {
  const config = ServerConfigManager.get(guild.id);

  const channel = guild.channels.cache.get(config.voiceChannelId ?? "");
  if (!channel || !channel.isVoiceBased()) return;

  let connection = getVoiceConnection(guild.id);
  const humanCount = channel.members.filter(m => !m.user.bot).size;

  if (connection)
    if (connection.joinConfig.channelId!==channel.id || humanCount<config.autoJoinThreshold){
      leaveChannel(connection, guild);
      connection = undefined;
    }

  if (humanCount >= config.autoJoinThreshold && !connection){
    // console.log('joining channel:', channel.id);
    joinChannel(guild, channel);
  }
}

async function joinChannel(guild: Guild, channel: VoiceBasedChannel) {
  const mutex = getMutex(guild.id);
  await mutex.runExclusive(async () => {
    const connection = getVoiceConnection(guild.id);
    if (connection) return;

    const newConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    VoiceReceiverManager.startListening(newConnection.receiver, channel.guild);
  });
}

async function leaveChannel(connection: VoiceConnection, guild: Guild) {
  const mutex = getMutex(guild.id);
  await mutex.runExclusive(async () => {
    VoiceReceiverManager.stopListening(connection.receiver, guild);
    connection.destroy();
  });
}

function getMutex(guildId: string) {
  if (!guildMutex.has(guildId)) {
    guildMutex.set(guildId, new Mutex());
  }
  return guildMutex.get(guildId)!;
}