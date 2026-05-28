import cron from 'node-cron';
import { cleanupOldFiles } from './cleanupOldFiles.js';
import printLog from '@/utils/printLog.js';

// 매일 03:00 실행
export function startCleanupScheduler() {
  cron.schedule('0 3 * * *', () => {
    printLog('running scheduled cleanup...');
    cleanupOldFiles();
  });
}