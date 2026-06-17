import cron from 'node-cron';
import { cleanupOldFiles } from './cleanupOldFiles.js';
import printLog from '@/storage/printLog.js';
import type { Client } from 'discord.js';

// 매일 03:00 실행
export function startCleanupScheduler(client: Client) {
  cron.schedule('0 3 * * *', () => {
    printLog('Running scheduled cleanup...');
    cleanupOldFiles(client);
  });
}