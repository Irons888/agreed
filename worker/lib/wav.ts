export type WavInfo = { sampleRate: number; channels: number; bitsPerSample: number; dataBytes: number; duration: number };

/** Reads a RIFF/WAVE header. Returns null for anything that is not uncompressed or float PCM. */
export function readWav(bytes: Uint8Array): WavInfo | null {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;

  let fmt: { format: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let dataBytes = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && offset + 24 <= bytes.length) {
      fmt = {
        format: view.getUint16(offset + 8, true),
        channels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        bitsPerSample: view.getUint16(offset + 22, true),
      };
    }
    if (id === 'data') {
      dataBytes = Math.min(size, bytes.length - offset - 8);
      break;
    }
    offset += 8 + size + (size % 2);
  }

  // 1 = PCM, 3 = float, 0xFFFE = extensible
  if (!fmt || !dataBytes || ![1, 3, 0xfffe].includes(fmt.format) || !fmt.sampleRate || !fmt.channels) return null;
  const bytesPerSecond = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    bitsPerSample: fmt.bitsPerSample,
    dataBytes,
    duration: dataBytes / bytesPerSecond,
  };
}
