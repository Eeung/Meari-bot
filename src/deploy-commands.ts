import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from '@/commands/index.js';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

async function main() {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.TESTGUILD_ID!),
    {body: Object.values(commands).map(cmd => cmd.data.toJSON())}
  );

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.TRPGGUILD_ID!),
    {body: Object.values(commands).map(cmd => cmd.data.toJSON())}
  );

  // await rest.put(
  //   Routes.applicationCommands(process.env.CLIENT_ID!),
  //   {body: []}
  // );

  console.log('commands deployed');
}

main();