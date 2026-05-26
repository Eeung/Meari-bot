import fs from 'fs';
import path from 'path';

export type GuildConfig = {
  voiceChannelId: string | null;
  bufferRetentionTime: number;
  autoJoinThreshold: number;
  enabledReplayBuffer: boolean;
};

const DEFAULT_CONFIG: GuildConfig = {
  voiceChannelId: null,
  bufferRetentionTime: 10000,
  autoJoinThreshold: 1,
  enabledReplayBuffer: false,
}

const filePath = path.join(process.cwd(), 'data', 'guilds.json');

export class ServerConfigManager {

  private static readFile(): Record<string, GuildConfig> {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      this.writeFile({});
    }
  
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '{}');
  }

  private static writeFile(data: Record<string, GuildConfig>) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  private static configs: Record<string, GuildConfig> = this.readFile();

  static get(guildId: string): GuildConfig {
    return {
      ...DEFAULT_CONFIG,
      ...(this.configs[guildId] || {})
    };
  }
  
  static set(guildId: string, newConfig: Partial<GuildConfig>) {
    const config = this.get(guildId);

    this.configs[guildId] = {
      ...config,
      ...newConfig
    };
    this.writeFile(this.configs);
  }

  static getAllGuildIds(): string[] {
    return Object.keys(this.configs);
  }
}