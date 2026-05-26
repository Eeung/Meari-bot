import cron from 'node-cron';
import { cleanupOldFiles } from './cleanupOldFiles.js';

// 매일 03:00 실행
export function startCleanupScheduler() {
  cron.schedule('0 3 * * *', () => {
    console.log('[CLEANUP] running scheduled cleanup...');
    cleanupOldFiles();
  });
}