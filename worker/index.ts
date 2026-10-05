import type { RunEvent } from './types';
import { MAX_SECONDS, runPipeline } from './pipeline/run';
import { DEFAULT_LLM, LLM_MODELS, type LlmModelName } from './pipeline/extract';
import { RETENTION_DAYS, deleteRun, isRunId, readAudio, readResult, saveAudio, saveResult, withinDailyCap } from './storage';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 3 minutes of 16 kHz mono WAV is about 5.8 MB
const REASONING = new Set(['low', 'medium', 'high']);

async function createRun(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES) return Response.json({ error: 'File is too large.' }, { status: 413 });

  const visitor = request.headers.get('cf-connecting-ip') ?? 'local';
  if (!(await env.RUN_LIMITER.limit({ key: visitor })).success) {
    return Response.json({ error: 'Too many analyses in a minute. Please wait a moment and try again.' }, { status: 429 });
  }
  if (!(await withinDailyCap(env.RUNS, Number(env.DAILY_RUN_CAP)))) {
    return Response.json({ error: 'The demo has reached its daily limit. Please try again tomorrow.' }, { status: 429 });
  }

  const wav = new Uint8Array(await request.arrayBuffer());
  if (wav.byteLength > MAX_UPLOAD_BYTES) return Response.json({ error: 'File is too large.' }, { status: 413 });

  const url = new URL(request.url);
  const asked = url.searchParams.get('reasoning') ?? '';
  const reasoning = REASONING.has(asked) ? asked : 'low';
  const requested = url.searchParams.get('model') ?? '';
  const model: LlmModelName = requested in LLM_MODELS ? (requested as LlmModelName) : DEFAULT_LLM;
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
        const stored = saveAudio(env.RUNS, id, wav);
        const result = await runPipeline(env, { id, wav, fileName, reasoning, model }, emit);
        await Promise.all([stored, saveResult(env.RUNS, result)]);
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
    if (pathname === '/api/health') return Response.json({ ok: true, maxSeconds: MAX_SECONDS, retentionDays: RETENTION_DAYS });

    const match = pathname.match(/^\/api\/runs\/([^/]+)(\/audio)?$/);
    if (match && isRunId(match[1])) {
      const [, id, audio] = match;
      if (request.method === 'GET') return audio ? readAudio(env.RUNS, id, request) : readResult(env.RUNS, id);
      if (request.method === 'DELETE' && !audio) {
        await deleteRun(env.RUNS, id);
        return new Response(null, { status: 204 });
      }
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
