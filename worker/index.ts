import type { RunEvent } from './types';
import { MAX_SECONDS, runPipeline } from './pipeline/run';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 3 minutes of 16 kHz mono WAV is about 5.8 MB
const REASONING = new Set(['low', 'medium', 'high']);

async function createRun(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES) return Response.json({ error: 'File is too large.' }, { status: 413 });
  const wav = new Uint8Array(await request.arrayBuffer());
  if (wav.byteLength > MAX_UPLOAD_BYTES) return Response.json({ error: 'File is too large.' }, { status: 413 });

  const url = new URL(request.url);
  const asked = url.searchParams.get('reasoning') ?? '';
  const reasoning = REASONING.has(asked) ? asked : 'low';
  const rawName = request.headers.get('x-file-name');
  const fileName = rawName ? decodeURIComponent(rawName).slice(0, 200) : null;
  const id = crypto.randomUUID();

  // Progress is streamed as one JSON object per line, so the page can show each step as it finishes.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const emit = (event: RunEvent) => void writer.write(encoder.encode(`${JSON.stringify(event)}\n`));

  ctx.waitUntil(
    (async () => {
      try {
        const result = await runPipeline(env, { id, wav, fileName, reasoning }, emit);
        emit({ type: 'result', result });
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'Processing failed.' });
      } finally {
        await writer.close();
      }
    })(),
  );

  return new Response(readable, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/runs' && request.method === 'POST') return createRun(request, env, ctx);
    if (pathname === '/api/health') return Response.json({ ok: true, maxSeconds: MAX_SECONDS });
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
