import type { AudioChunk } from '@/audio/AudioChunk.js';
import { spawn } from 'child_process';
import type Denque from 'denque';
import prism from 'prism-media';
import { Readable } from 'stream';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const FRAME_SIZE = 960;
const FRAME_DURATION = 20;
const PCM_FRAME_BYTES = FRAME_SIZE*CHANNELS*2;

export async function  createWavStream(chunks: Denque<AudioChunk>, endTimestamp: number) {
  if (!chunks.length) return;

  const sorted = [...chunks.toArray()].sort((a, b) => a.timestamp - b.timestamp);

  const decoder = new prism.opus.Decoder({
    rate: SAMPLE_RATE,
    channels: CHANNELS,
    frameSize: FRAME_SIZE
  });

  const decodedFrames: Buffer[] = [];

  let pcmCache = Buffer.alloc(0);

  decoder.on('data', (pcm: Buffer) => {
    pcmCache = Buffer.concat([pcmCache, pcm]);

    while (pcmCache.length >= PCM_FRAME_BYTES) {
      decodedFrames.push(pcmCache.subarray(0, PCM_FRAME_BYTES));
      pcmCache = pcmCache.subarray(PCM_FRAME_BYTES);
    }
  });

  const decodeFinished = new Promise<void>((resolve, reject) => {
    decoder.on('end', () => resolve());
    decoder.on('error', (e) => reject(e));
  });

  for (const chunk of sorted)
    decoder.write(chunk.data);

  decoder.end();

  await decodeFinished;

  const timelineFrames: Buffer[] = [];

  const startTime = sorted[0]!.timestamp;

  let decodedIndex = 0;
  let currentFrame = 0;

  for (const chunk of sorted) {
    const targetFrame = Math.round(
      (chunk.timestamp - startTime) / FRAME_DURATION
    );

    while (currentFrame < targetFrame) {
      timelineFrames.push(createSilenceFrame());
      currentFrame++;
    }

    if (decodedIndex < decodedFrames.length) {
      timelineFrames.push(decodedFrames[decodedIndex]!);
      decodedIndex++;
      currentFrame++;
    }
  }

  while (decodedIndex < decodedFrames.length) {
    timelineFrames.push(decodedFrames[decodedIndex]!);
    decodedIndex++;
    currentFrame++;
  }

  const finalTargetFrame = Math.round( (endTimestamp-startTime)/FRAME_DURATION );
  while (currentFrame < finalTargetFrame) {
    timelineFrames.push(createSilenceFrame());
    currentFrame++;
  }

  const ffmpeg = spawn('ffmpeg', [
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-i', 'pipe:0',
    '-f', 'wav',
    'pipe:1'
  ]);

  const input = new Readable({ read() { } });

  for (const frame of timelineFrames) {
    input.push(frame);
  }

  input.push(null);
  input.pipe(ffmpeg.stdin);

  return ffmpeg.stdout;
}

function createSilenceFrame() {
  return Buffer.alloc(PCM_FRAME_BYTES);
}