import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export function createDownloadMessage(
  fileName: string,
  downloadUrl: string,
  members: string[]
) {
  const embed = new EmbedBuilder()
    .setTitle('리플레이 버퍼 저장 완료')
    .setDescription(
      `
        파일명: ${fileName}\n
        저장된 멤버: ${members.toString()}
      `
    )
    .setColor('Blue');

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('다운로드')
        .setStyle(ButtonStyle.Link)
        .setURL(downloadUrl)
    );

  return {
    embeds: [embed],
    components: [row]
  };
}

export function createExpiredDownloadMessage(
  fileName: string
) {
  const embed = new EmbedBuilder()
    .setTitle('다운로드 기간 만료')
    .setDescription(
      `파일명: ${fileName}`
    )
    .setColor('Red');

  return {
    embeds: [embed],
    components: []
  };
}