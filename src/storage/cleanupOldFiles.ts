import printLog from '@/utils/printLog.js';
import fs from 'fs';
import path from 'path';
import { MessageDataStore, type MessageRecord } from './messageData.js';
import { createExpiredDownloadMessage } from '../utils/ImbededUrl.js';
import { type Client } from 'discord.js';

const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');
const LOG_DIR = path.join(process.cwd(), 'logs');

// 7일
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

export async function cleanupOldFiles(client: Client, options?: {
  force?: boolean;
  dryRun?: boolean;
}) {
  const now = Date.now();

  cleanupLogFiles(now);
  await cleanupRecordingFiles(client, now, options);
}

async function cleanupRecordingFiles(client: Client, now: number, options?: {
  force?: boolean;
  dryRun?: boolean;
}) {
  const { force = false, dryRun = false } = options ?? {};
  if (!fs.existsSync(RECORDINGS_DIR)) return;

  const cleanupMethod = async ([messageId, record]: [string, MessageRecord]) => {
    const fullPath = path.join(RECORDINGS_DIR, record.fileName);
    if (!fs.existsSync(fullPath)) {
      MessageDataStore.delete(messageId);
      printLog("FAILED", "해당 파일이 존재하지 않습니다.");
      return;
    }

    const age = now - record.createdAt;
    if (!force && age <= SEVEN_DAYS) return;
    printLog("Deleting file", record.fileName);

    if (dryRun) return;
    const channel = await client.channels.fetch(record.channelId);
    let message;
    try {
      if (!channel || !channel?.isTextBased()) throw new Error();
      message = await channel.messages.fetch(messageId);
    } catch {
      fs.unlinkSync(fullPath);
      MessageDataStore.delete(messageId);
      printLog("FAILED", "해당 채널 또는 메세지가 존재하지 않습니다.");
      return;
    }

    try {
      await message.edit(createExpiredDownloadMessage(record.fileName));
      fs.unlinkSync(fullPath);
      MessageDataStore.delete(messageId);
      printLog('Success')
    } catch (e) {
      printLog("FAILED", `${e}`);
    }
  }

  const messageData = MessageDataStore.getAll();
  const entries = Object.entries(messageData);
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    const tasks = batch.map(cleanupMethod);
    await Promise.allSettled(tasks);
  }
}

function cleanupLogFiles(now: number){
  if (!fs.existsSync(LOG_DIR)) return;

  const files = fs.readdirSync(LOG_DIR);

  for (const file of files) {
    const fullPath = path.join(LOG_DIR, file);
    const stat = fs.statSync(fullPath);

    // 폴더/파일 구분 없이 안전 처리
    if (!stat.isFile()) continue;

    const age = now - stat.mtimeMs;

    if (age > ONE_MONTH) {
      printLog(`deleting file: ${file}`);

      fs.unlinkSync(fullPath);
    }
  }
}