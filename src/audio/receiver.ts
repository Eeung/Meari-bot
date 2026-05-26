import { AudioReceiveStream, EndBehaviorType, VoiceReceiver } from '@discordjs/voice';
import type { AudioChunk } from './AudioChunk.js';
import type { Guild } from 'discord.js';
import { ServerConfigManager } from '@/storage/guildConfig.js';

type UserBuffers = Map<string, AudioChunk[]>;
type GuildBuffers = Map<string, UserBuffers>;
type ActiveStreams = Map<string, Set<string>>;

export class VoiceReceiverManager {
  private static buffers: GuildBuffers = new Map();
  private static activeStreams: ActiveStreams  = new Map();
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static speakingListeners = new Map<string, (...args: any[]) => void>();
  private static streamMap = new Map<string, Set<AudioReceiveStream>>();

  static async startListening(receiver: VoiceReceiver, guild: Guild) {
    if (this.speakingListeners.has(guild.id)) return;
    const handler = (userId: string) => {
      if(!this.activeStreams.has(guild.id))
        this.activeStreams.set(guild.id, new Set());

      const guildStreams = this.activeStreams.get(guild.id)!;

      if(guildStreams.has(userId)) return;
      guildStreams.add(userId);

      this.handleUserStream(receiver, guild.id, userId);
    }
    this.speakingListeners.set(guild.id, handler);

    receiver.speaking.on('start', handler);
    console.log("말 시작")

    if(this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 1000);

    const me = await guild.members.fetchMe();
    await me.setNickname('🟡 메아리');
  }

  static async stopListening(receiver: VoiceReceiver, guild: Guild) {
    const me = await guild.members.fetchMe();
    await me.setNickname('⚪ 메아리');
    const handler = this.speakingListeners.get(guild.id);
    if (handler)
      receiver.speaking.off('start', handler);
    this.speakingListeners.delete(guild.id);

    const streams = this.streamMap.get(guild.id);
    if (streams)
      for (const stream of streams) {
        stream.destroy();
        stream.removeAllListeners();
        streams.delete(stream);
      }

    this.streamMap.delete(guild.id);
    this.activeStreams.delete(guild.id);
    this.buffers.delete(guild.id);

    if (this.speakingListeners.size === 0 && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private static handleUserStream(receiver: VoiceReceiver, guildId: string, userId: string) {
    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000
      }
    });

    if (!this.streamMap.has(guildId))
      this.streamMap.set(guildId, new Set());
    this.streamMap.get(guildId)!.add(opusStream);

    if (!this.buffers.has(guildId)) 
      this.buffers.set(guildId, new Map());

    const guildBuffers = this.buffers.get(guildId)!;

    const bufferList: AudioChunk[] = guildBuffers.get(userId) || [];
    guildBuffers.set(userId, bufferList);

    opusStream.on('data', (chunk: Buffer) => {
      bufferList.push({ data: chunk, timestamp: Date.now() });
    });

    opusStream.on('end', () => {
      console.log(`stream ended: ${userId}`);

      const guildStreams = this.activeStreams.get(guildId);
      if (!guildStreams) return;
      guildStreams.delete(userId);

      if (guildStreams.size === 0)
        this.activeStreams.delete(guildId);
    });
  }

  private static cleanup() {
    const now = Date.now();

    for (const [guildId, userBuffers] of this.buffers) {
      const config = ServerConfigManager.get(guildId);
      for (const [userId, bufferList] of userBuffers) {
        while (bufferList[0] && now - bufferList[0].timestamp > config.bufferRetentionTime)
          bufferList.shift();

        if (bufferList.length === 0)
          userBuffers.delete(userId);
      }

      if (userBuffers.size === 0) 
        this.buffers.delete(guildId);
    }
  }

  static getUserBuffers(guildId: string, userId: string) {
    return this.getServerBuffers(guildId)?.get(userId);
  }

  static getServerBuffers(guildId: string) {
    return this.buffers.get(guildId);
  }

  static clear(guildId: string, userId: string) {
    this.buffers.get(guildId)?.delete(userId);
  }

  static clearAll(guildId: string) {
    const guildBuffers=this.buffers.get(guildId);
    if(!guildBuffers) return;

    guildBuffers.clear(); // 내부 map clear
    this.buffers.delete(guildId);
  }
}