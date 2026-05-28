import { formatTimestamp } from "./dateFormat.js";

export default function printLog(message: string) {
  const timestamp = formatTimestamp(Date.now());
  console.log(`[${timestamp}] ${message}`);
}