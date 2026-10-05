// POST raw WAV bytes (?model=nova-3 default, ?model=whisper) or a JSON chat request (?model=llm).
const toBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('POST a WAV file', { status: 405 });
    const model = new URL(request.url).searchParams.get('model') ?? 'nova-3';
    const bytes = new Uint8Array(await request.arrayBuffer());
    const started = Date.now();
    try {
      let out;
      if (model === 'nova-3') {
        const q = new URL(request.url).searchParams;
        const options = { diarize: true, smart_format: true, punctuate: true, utterances: true, language: 'en' };
        if (q.has('smart_format')) options.smart_format = q.get('smart_format') === 'true';
        if (q.has('utt_split')) options.utt_split = Number(q.get('utt_split'));
        out = await env.AI.run('@cf/deepgram/nova-3', {
          audio: { body: new Blob([bytes]).stream(), contentType: 'audio/wav' },
          ...options,
        });
      } else if (model === 'llm') {
        // Body: { messages, response_format?, max_tokens? } as JSON.
        out = await env.AI.run('@cf/openai/gpt-oss-120b', JSON.parse(new TextDecoder().decode(bytes)));
      } else {
        out = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: toBase64(bytes), language: 'en' });
      }
      return Response.json({ model, ms: Date.now() - started, out });
    } catch (err) {
      return Response.json({ model, ms: Date.now() - started, error: String(err?.message ?? err) }, { status: 500 });
    }
  },
};
