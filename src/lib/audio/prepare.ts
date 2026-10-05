import { clock } from '../format';

export const TARGET_RATE = 16000;
export const MAX_SECONDS = 180;
const MAX_FILE_BYTES = 200 * 1024 * 1024;

export type PreparedAudio = { name: string; wav: Blob; url: string; duration: number; peaks: number[] };

export class AudioProblem extends Error {
  constructor(
    readonly kind: 'too_long' | 'too_short' | 'unreadable' | 'too_big',
    message: string,
  ) {
    super(message);
  }
}

/**
 * Any audio or video the browser can decode becomes 16 kHz mono WAV before upload:
 * one format for the server, a smaller upload, and the length is checked before anything is sent.
 */
export async function prepareAudio(file: Blob, name: string): Promise<PreparedAudio> {
  if (file.size > MAX_FILE_BYTES) throw new AudioProblem('too_big', 'The file is larger than 200 MB.');
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new AudioProblem('unreadable', 'The browser could not read an audio track in this file. MP3, M4A, WAV and MP4 work best.');
  } finally {
    void context.close();
  }
  if (decoded.duration > MAX_SECONDS + 1) {
    throw new AudioProblem('too_long', `The recording is ${clock(decoded.duration)} long. This prototype handles up to 3:00.`);
  }
  if (decoded.duration < 3) throw new AudioProblem('too_short', 'The recording is shorter than 3 seconds.');

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const samples = (await offline.startRendering()).getChannelData(0);
  const wav = encodeWav(samples, TARGET_RATE);
  return { name, wav, url: URL.createObjectURL(wav), duration: samples.length / TARGET_RATE, peaks: computePeaks(samples, 480) };
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Loudest sample per bucket, scaled to 0..1, for drawing the waveform. */
export function computePeaks(samples: Float32Array, buckets: number): number[] {
  const size = Math.max(1, Math.floor(samples.length / buckets));
  const peaks: number[] = [];
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    let peak = 0;
    for (let i = b * size; i < Math.min(samples.length, (b + 1) * size); i++) peak = Math.max(peak, Math.abs(samples[i]));
    peaks.push(peak);
    max = Math.max(max, peak);
  }
  return peaks.map((p) => (max ? p / max : 0));
}

/** Fetches one of the bundled test recordings and prepares it like an upload. */
export async function prepareSample(url: string, name: string) {
  const res = await fetch(url);
  if (!res.ok) throw new AudioProblem('unreadable', 'The sample could not be loaded.');
  return prepareAudio(await res.blob(), name);
}
