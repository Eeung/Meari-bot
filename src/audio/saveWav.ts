import type { AudioChunk } from '@/audio/AudioChunk.js';
import { Worker } from 'worker_threads';
import type Denque from 'denque';
import { Readable } from 'stream';
import path from 'path';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const FRAME_SIZE = 960;
const FRAME_DURATION = 20;
const PCM_FRAME_BYTES = FRAME_SIZE*CHANNELS*2;
const BIT_DEPTH = 16;

const SILENCE_FRAME = Buffer.alloc(PCM_FRAME_BYTES);

export async function  createWavStream(chunks: Denque<AudioChunk>, endTimestamp: number) {
  if (!chunks.length) return;

  const sorted = [...chunks.toArray()].sort((a, b) => a.timestamp - b.timestamp);

  const decodedFrames: Buffer[] = await decodeWithWorker(chunks);

  const timelineFrames: Buffer[] = [];

  const startTime = sorted[0]!.timestamp;

  let decodedIndex = 0;
  let currentFrame = 0;

  for (const chunk of sorted) {
    const targetFrame = Math.round( (chunk.timestamp-startTime)/FRAME_DURATION );
    while (currentFrame < targetFrame) {
      timelineFrames.push(SILENCE_FRAME);
      currentFrame++;
    }

    if (decodedIndex >= decodedFrames.length) continue;
    timelineFrames.push(decodedFrames[decodedIndex]!);
    decodedIndex++;
    currentFrame++;
  }

  while (decodedIndex < decodedFrames.length) {
    timelineFrames.push(decodedFrames[decodedIndex]!);
    decodedIndex++;
    currentFrame++;
  }

  const finalTargetFrame = Math.round( (endTimestamp-startTime)/FRAME_DURATION );
  while (currentFrame < finalTargetFrame) {
    timelineFrames.push(SILENCE_FRAME);
    currentFrame++;
  }

  const dataSize = timelineFrames.length * PCM_FRAME_BYTES;

  const wavHeader = createWavHeader(dataSize);

  return Readable.from([
    wavHeader,
    ...timelineFrames
  ]);
}

function decodeWithWorker(chunks: Denque<AudioChunk>): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve('./src/audio/decodeWorker.js'));

    worker.postMessage(chunks.toArray());

    worker.on('message', (decoded) => {
      resolve(decoded);
      worker.terminate();
    });

    worker.on('error', reject);
  });
}

function createWavHeader(dataSize: number) {
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);

  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);

  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);

  const byteRate = SAMPLE_RATE * CHANNELS * BIT_DEPTH / 8;
  header.writeUInt32LE(byteRate, 28);

  const blockAlign = CHANNELS * BIT_DEPTH / 8;
  header.writeUInt16LE(blockAlign, 32);

  header.writeUInt16LE(BIT_DEPTH, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}