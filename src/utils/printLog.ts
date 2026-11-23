import { getDate, getTime } from "./dateFormat.js";
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

export default function printLog(level?: string, message?: string) {
  const now = Date.now();

  const date = getDate(now);
  const time = getTime(now);

  const line = `[${time}] ${level}: ${message}\n`;

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(
    path.join(LOG_DIR, `${date}.log`),
    line
  );

  console.log(line.trimEnd());
}