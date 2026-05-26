import { createSubCommandRouter } from "@/commands/CommandTypes.js";
import toggle from "./toggle.js"
import save from "./save.js"
import { PermissionFlagsBits } from "discord.js";

export default createSubCommandRouter({
  name: "replaybuf",
  description: "리플레이 버퍼",
  permission: PermissionFlagsBits.Administrator,
  subCommands: {
    toggle,
    save,
  }
})