import fs from 'fs';
import path from 'path';

export type MessageRecord = {
  channelId: string;
  fileName: string;
  createdAt: number;
};

const filePath = path.join(process.cwd(), 'data', 'messages.json');

function read(): Record<string, MessageRecord> {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{}');
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '{}');
}

function write(data: Record<string, MessageRecord>) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export class MessageDataStore {
  private static cache: Record<string, MessageRecord> = read();

  static set(messageId: string, record: MessageRecord) {
    this.cache[messageId] = record;
    write(this.cache);
  }

  static getAll() {
    return this.cache;
  }

  static delete(messageId: string) {
    delete this.cache[messageId];
    write(this.cache);
  }
}