type GuildState = {
  enabled: boolean;
};

export class AutoReplayState {
  private static state = new Map<string, GuildState>();

  static enable(guildId: string) {
    this.state.set(guildId, { enabled: true });
  }

  static disable(guildId: string) {
    this.state.set(guildId, { enabled: false });
  }

  static isEnabled(guildId: string) {
    return this.state.get(guildId)?.enabled ?? false;
  }
}