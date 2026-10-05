import type { Result } from './types';

// Every run lives under runs/<id>/ in R2. A bucket lifecycle rule deletes it after 30 days;
// the Delete button removes it at once. Ids are random UUIDs, so a result is only reachable by its link.

export const RETENTION_DAYS = 30;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isRunId = (id: string) => ID.test(id);
const audioKey = (id: string) => `runs/${id}/audio.wav`;
const resultKey = (id: string) => `runs/${id}/result.json`;

export async function saveAudio(bucket: R2Bucket, id: string, wav: Uint8Array) {
  await bucket.put(audioKey(id), wav, { httpMetadata: { contentType: 'audio/wav' } });
}

export async function saveResult(bucket: R2Bucket, result: Result) {
  await bucket.put(resultKey(result.id), JSON.stringify(result), { httpMetadata: { contentType: 'application/json' } });
}

export async function readResult(bucket: R2Bucket, id: string): Promise<Response> {
  const object = await bucket.get(resultKey(id));
  if (!object) return Response.json({ error: 'This result was deleted or has expired.' }, { status: 404 });
  return new Response(object.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

/** Serves the recording with byte ranges, so the browser can seek straight to a quote. */
export async function readAudio(bucket: R2Bucket, id: string, request: Request): Promise<Response> {
  const object = await bucket.get(audioKey(id), { range: request.headers });
  if (!object) return Response.json({ error: 'This recording was deleted or has expired.' }, { status: 404 });
  const headers = new Headers({ 'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' });
  object.writeHttpMetadata(headers);
  const range = object.range as { offset?: number; length?: number } | undefined;
  if (range && request.headers.has('range')) {
    const offset = range.offset ?? 0;
    const length = range.length ?? object.size - offset;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('content-length', String(object.size));
  return new Response(object.body, { headers });
}

export async function deleteRun(bucket: R2Bucket, id: string) {
  await bucket.delete([audioKey(id), resultKey(id)]);
}

/**
 * A rough daily ceiling on analyses for the public demo, so a burst of traffic can't run up the bill.
 * Read-modify-write is not atomic; a few extra runs on a busy day are acceptable.
 */
export async function withinDailyCap(bucket: R2Bucket, cap: number): Promise<boolean> {
  const key = `usage/${new Date().toISOString().slice(0, 10)}.json`;
  const current = await bucket.get(key);
  const count = current ? ((await current.json()) as { runs: number }).runs : 0;
  if (count >= cap) return false;
  await bucket.put(key, JSON.stringify({ runs: count + 1 }), { httpMetadata: { contentType: 'application/json' } });
  return true;
}
