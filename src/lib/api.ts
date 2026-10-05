import type { Result, RunEvent } from '../../worker/types';

/** Uploads a WAV recording and streams progress events until the verified result arrives. */
export async function analyze(wav: Blob, fileName: string, onEvent: (event: RunEvent) => void, signal?: AbortSignal): Promise<Result> {
  const res = await fetch('/api/runs', {
    method: 'POST',
    body: wav,
    headers: { 'content-type': 'audio/wav', 'x-file-name': encodeURIComponent(fileName) },
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `The server answered ${res.status}.`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let result: Result | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line) as RunEvent;
      if (event.type === 'error') throw new Error(event.message);
      if (event.type === 'result') result = event.result;
      onEvent(event);
    }
  }
  if (!result) throw new Error('The connection closed before the result was ready.');
  return result;
}
