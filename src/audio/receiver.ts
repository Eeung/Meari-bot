import { AudioReceiveStream, EndBehaviorType, VoiceReceiver } from '@discordjs/voice';
import type { AudioChunk } from './AudioChunk.js';
import type { Guild } from 'discord.js';
import { GuildConfigManager } from '@/storage/guildConfig.js';
import { GlobalVar } from '@/globalVar.js';
import Denque from 'denque';

type UserBuffers = Map<string, Denque<AudioChunk>>;

export class VoiceReceiverManager {
  // 서버ID -> 유저ID -> 오디오 청크 배열
  private static buffers: Map<string, UserBuffers> = new Map();
  // 서버ID -> 유저ID 집합: 현재 스트림이 활성화된 유저
  private static activeStreams: Map<string, Set<string>>  = new Map();
  // 서버ID -> 유저별 스트림 집합: 현재 활성화된 유저의 스트림
  private static streamMap: Map<string, Set<AudioReceiveStream>>  = new Map();
  // 서버ID -> 이벤트 핸들러: speaking 이벤트 리스너 저장
  private static speakingListeners: Map<string, (...args: any[]) => void> = new Map();

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
    console.log("말 시작");

    const me = await GlobalVar.getMe(guild);
    await me.setNickname('🟡 메아리');
  }

  static async stopListening(receiver: VoiceReceiver, guild: Guild) {
    const me = await GlobalVar.getMe(guild);
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

    const bufferList: Denque<AudioChunk> = guildBuffers.get(userId) || new Denque();
    guildBuffers.set(userId, bufferList);

    opusStream.on('data', (chunk: Buffer) => {
      bufferList.push({ data: chunk, timestamp: Date.now() });
      this.cleanup(guildId, userId); // 새 데이터가 들어올 때마다 오래된 버퍼 정리
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

  private static cleanup(guildId: string, userId: string) {
    const now = Date.now();

    const userBuffer = this.buffers.get(guildId)?.get(userId);
    if (!userBuffer) return;
    const config = GuildConfigManager.get(guildId);
    while (userBuffer.peekFront() && now-userBuffer.peekFront()!.timestamp > config.bufferRetentionTime)
      userBuffer.shift();

    if (userBuffer.length === 0)
      this.buffers.get(guildId)?.delete(userId);
  }

  static getUserBuffer(guildId: string, userId: string) {
    return this.getGuildBuffers(guildId)?.get(userId);
  }

  static getGuildBuffers(guildId: string) {
    const userBuffers = this.buffers.get(guildId);
    if (!userBuffers) return undefined;

    // 접근 시 각 유저의 버퍼를 정리하여 반환
    for (const userId of userBuffers.keys()) {
      this.cleanup(guildId, userId);
    }
    
    return userBuffers;
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