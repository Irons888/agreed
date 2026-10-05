import type { Result, RunEvent } from '../../worker/types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An error the server reported on purpose, as opposed to a broken connection. */
class ServerError extends Error {}

/** After a dropped connection the server keeps going and stores the result; fetch it by id. */
async function recover(id: string, signal?: AbortSignal): Promise<Result | null> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline && !signal?.aborted) {
    const res = await fetch(`/api/runs/${id}`, { signal }).catch(() => null);
    if (res?.ok) return (await res.json()) as Result;
    await wait(2000);
  }
  return null;
}

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
  let runId: string | null = null;
  let result: Result | null = null;
  try {
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
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
        if (event.type === 'tick') continue;
        if (event.type === 'error') throw new ServerError(event.message);
        if (event.type === 'accepted') runId = event.id;
        if (event.type === 'result') result = event.result;
        onEvent(event);
      }
    }
  } catch (err) {
    // A reported error is final; a broken connection is not: the result may already be stored.
    if (err instanceof ServerError || signal?.aborted) throw err;
  }
  if (!result && runId) result = await recover(runId, signal);
  if (!result) throw new Error('The connection dropped before the result was ready.');
  return result;
}
