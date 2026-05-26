import type { Guild, GuildMember } from "discord.js";

export class GlobalVar {
  private static me: Map<string, GuildMember> = new Map();

  static setMe(guildId: string, member: GuildMember) {
    this.me.set(guildId, member);
  }
  static async getMe(guild: Guild): Promise<GuildMember> {
    if (!this.me.has(guild.id)) {
      const me = await guild.members.fetchMe();
      this.me.set(guild.id, me);
      return me;
    }
    return this.me.get(guild.id)!;
  }
}