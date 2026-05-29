import { parentPort } from 'worker_threads';
import prism from 'prism-media';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const FRAME_SIZE = 960;
const PCM_FRAME_BYTES = FRAME_SIZE * CHANNELS * 2;

parentPort.on('message', (chunks) => {
  const decoder = new prism.opus.Decoder({
    rate: SAMPLE_RATE,
    channels: CHANNELS,
    frameSize: FRAME_SIZE
  });

  const decoded = [];
  const pcmAcc = new PcmFrameAccumulator(PCM_FRAME_BYTES);

  const done = new Promise((resolve, reject) => {
    decoder.on('data', (pcm) => {
      const frames = pcmAcc.push(pcm);
      decoded.push(...frames);
    });
    decoder.on('end', ()=> {
      decoded.push(...pcmAcc.flushRemaining());
      resolve();
    });
    decoder.on('error', reject);
  });

  for (const chunk of chunks)
    decoder.write(chunk.data);

  decoder.end();

  done.then(() => {
    parentPort.postMessage(decoded);
  }).catch((err) => {
    parentPort.postMessage({ error: err.message });
  });
});

class PcmFrameAccumulator {
  buffer;
  writeOffset = 0;

  constructor(framePerBytes) {
    this.buffer = Buffer.alloc(framePerBytes);
  }

  /**
   * PCM 데이터를 입력받아서 frame 단위로 잘라서 반환
   */
  push(chunk) {
    const frames = [];
    let offset = 0;

    while (offset < chunk.length) {
      const spaceLeft = this.buffer.length - this.writeOffset;
      const toCopy = Math.min(spaceLeft, chunk.length - offset);

      chunk.copy(this.buffer, this.writeOffset, offset, offset + toCopy);

      this.writeOffset += toCopy;
      offset += toCopy;

      // 프레임 완성
      if (this.writeOffset === this.buffer.length) {
        frames.push(Buffer.from(this.buffer));
        this.writeOffset = 0;
      }
    }

    return frames;
  }

  /**
   * 남은 데이터 버림 (or silence padding 가능)
   */
  flushRemaining() {
    if (this.writeOffset === 0) return [];

    const remaining = Buffer.alloc(this.buffer.length);
    this.buffer.copy(remaining, 0, 0, this.writeOffset);
    this.writeOffset = 0;

    return [remaining];
  }
}