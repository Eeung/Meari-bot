import printLog from '@/utils/printLog.js';
import fs from 'fs';
import path from 'path';

const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');

// 7일
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function cleanupOldFiles(options?: {
  force?: boolean;
  dryRun?: boolean;
}) {
  const { force = false, dryRun = false } = options ?? {};

  if (!fs.existsSync(RECORDINGS_DIR)) return;

  const now = Date.now();
  const files = fs.readdirSync(RECORDINGS_DIR);

  for (const file of files) {
    const fullPath = path.join(RECORDINGS_DIR, file);
    const stat = fs.statSync(fullPath);

    // 폴더/파일 구분 없이 안전 처리
    if (!stat.isFile()) continue;

    const age = now - stat.mtimeMs;

    if (force || age > SEVEN_DAYS) {
      printLog(`deleting file: ${file}`);
      
      if (dryRun) continue;
      fs.unlinkSync(fullPath);
    }
  }
}