#!/usr/bin/env node
// Builds the test-set audio from testset/*/script.json with ElevenLabs text-to-speech.
//
// Every line is synthesized on its own and stitched together with pauses, so we know
// exactly when each line starts and ends (timeline.json). Lines are cached by voice and
// text, which keeps unchanged lines byte-identical between T1 and T2.
// A case with "engine": "dialogue" (T8) is generated as one conversation instead, so turns,
// laughter and interruptions sound like a real call; the API returns when every character is
// spoken, which gives the same timeline.
//
//   node testset/build.mjs                    build every case
//   node testset/build.mjs T1-main T6-noisy   build selected cases
//   node testset/build.mjs --list-voices      show the voices your API key can use
//
// Needs ELEVENLABS_API_KEY in testset/.env (see testset/.env.example) and ffmpeg for T6.
// The key lives here, not in the project root, so the Worker's local dev never loads it.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTSET = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(TESTSET, '.cache');
const RATE = 16000;
const LEAD_IN_MS = 400;
const TAIL_MS = 600;
const GAP_MS = 450;
const MAX_SECONDS = 180;

try {
  process.loadEnvFile(path.join(TESTSET, '.env'));
} catch {
  // No .env file: the key may come from the environment.
}

const config = JSON.parse(await readFile(path.join(TESTSET, 'voices.json'), 'utf8'));
let charactersSent = 0;

async function eleven(pathname, init = {}) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is missing. Copy testset/.env.example to testset/.env and add your key.');
  const res = await fetch(`https://api.elevenlabs.io${pathname}`, {
    ...init,
    headers: { 'xi-api-key': key, ...init.headers },
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} on ${pathname}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

async function listVoices() {
  const { voices } = await (await eleven('/v1/voices')).json();
  return voices;
}

// Candidates are ElevenLabs premade voices. If the key may list voices, only voices the
// account actually has are picked; otherwise the premade IDs are used as they are.
async function resolveVoices() {
  let available = null;
  try {
    available = new Set((await listVoices()).map((v) => v.voice_id));
  } catch (err) {
    if (!/voices_read|missing_permissions/.test(err.message)) throw err;
    console.log('This key cannot list voices, so the premade voice IDs from voices.json are used as is.');
  }
  const used = new Set();
  const resolved = {};
  for (const [speaker, candidates] of Object.entries(config.speakers)) {
    const voice = candidates.find((c) => !used.has(c.voice_id) && (!available || available.has(c.voice_id)));
    if (!voice) throw new Error(`No available voice for "${speaker}" in voices.json.`);
    used.add(voice.voice_id);
    resolved[speaker] = voice;
  }
  for (const [alias, speaker] of Object.entries(config.aliases ?? {})) resolved[alias] = resolved[speaker];
  return resolved;
}

async function synthesize(voiceId, text) {
  const id = createHash('sha1').update([voiceId, config.model, config.seed, text].join('\n')).digest('hex');
  const file = path.join(CACHE, `${id}.pcm`);
  try {
    return await readFile(file);
  } catch {
    // Not cached yet.
  }
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: config.model, seed: config.seed }),
  };
  let pcm;
  try {
    const res = await eleven(`/v1/text-to-speech/${voiceId}?output_format=pcm_16000`, init);
    pcm = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (!/output_format|pcm/i.test(err.message)) throw err;
    // Some plans can't request raw PCM: take MP3 and decode it locally.
    const res = await eleven(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, init);
    pcm = execFileSync(
      'ffmpeg',
      ['-loglevel', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', String(RATE), 'pipe:1'],
      { input: Buffer.from(await res.arrayBuffer()), maxBuffer: 1 << 28 },
    );
  }
  charactersSent += text.length;
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, pcm);
  return pcm;
}

// Cut the synthesizer's leading and trailing silence so timeline.json marks actual speech.
function trimSilence(pcm, threshold = 400, marginMs = 40) {
  const samples = Math.floor(pcm.length / 2);
  let start = 0;
  let end = samples - 1;
  while (start < samples && Math.abs(pcm.readInt16LE(start * 2)) < threshold) start++;
  while (end > start && Math.abs(pcm.readInt16LE(end * 2)) < threshold) end--;
  const margin = Math.round((RATE * marginMs) / 1000);
  return pcm.subarray(Math.max(0, start - margin) * 2, (Math.min(samples - 1, end + margin) + 1) * 2);
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const silence = (ms) => Buffer.alloc(Math.round((RATE * ms) / 1000) * 2);
const round = (seconds) => Math.round(seconds * 1000) / 1000;
const clock = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

async function loadScript(dir) {
  const script = JSON.parse(await readFile(path.join(dir, 'script.json'), 'utf8'));
  if (!script.base) return script;
  const base = await loadScript(path.resolve(dir, script.base));
  const lines = base.lines.map((line) => ({ ...line, ...script.replace?.[line.id] }));
  return { ...base, case: script.case, title: script.title, change: script.change, lines };
}

function scriptMarkdown(script, timeline) {
  const who = (speaker) => (script.speakers?.[speaker] ?? speaker).split(/[,(]/)[0].trim();
  return [
    `# ${script.case}: ${script.title}`,
    '',
    ...(script.change ? [`**Change from the base script:** ${script.change}`, ''] : []),
    '| Line | Time | Speaker | Text |',
    '|---|---|---|---|',
    ...timeline.map((l) => `| ${l.id} | ${clock(l.start)}–${clock(l.end)} | ${who(l.speaker)} | ${l.text} |`),
    '',
  ].join('\n');
}

async function buildSpoken(dir, script, voices) {
  const parts = [silence(LEAD_IN_MS)];
  const timeline = [];
  let t = LEAD_IN_MS / 1000;
  for (const [i, line] of script.lines.entries()) {
    if (i > 0) {
      const gap = line.pause_before_ms ?? GAP_MS;
      parts.push(silence(gap));
      t += gap / 1000;
    }
    const pcm = trimSilence(await synthesize(voices[line.speaker].voice_id, line.text));
    const seconds = pcm.length / 2 / RATE;
    timeline.push({ id: line.id, speaker: line.speaker, text: line.text, start: round(t), end: round(t + seconds) });
    parts.push(pcm);
    t += seconds;
  }
  parts.push(silence(TAIL_MS));
  const duration = round(t + TAIL_MS / 1000);
  await writeFile(path.join(dir, 'audio.wav'), wav(Buffer.concat(parts)));
  await writeFile(path.join(dir, 'timeline.json'), `${JSON.stringify({ case: script.case, duration, lines: timeline }, null, 2)}\n`);
  await writeFile(path.join(dir, 'script.md'), scriptMarkdown(script, timeline));
  return duration;
}

// Requests stay under the length the dialogue API generates reliably.
const DIALOGUE_MAX_CHARS = 1800;
const DIALOGUE_JOIN_MS = 250;

async function dialogue(model, seed, inputs) {
  const id = createHash('sha1').update(JSON.stringify({ model, seed, inputs })).digest('hex');
  const file = path.join(CACHE, `${id}.dialogue.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    // Not cached yet.
  }
  const res = await eleven('/v1/text-to-dialogue/with-timestamps?output_format=pcm_16000', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inputs, model_id: model, seed }),
  });
  const body = await res.json();
  charactersSent += inputs.reduce((n, input) => n + input.text.length, 0);
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, JSON.stringify(body));
  return body;
}

// An interruption stays in the same request as the line it cuts off.
function dialogueChunks(lines) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const line of lines) {
    if (current.length > 1 && size + line.text.length > DIALOGUE_MAX_CHARS) {
      const carried = line.overlap_ms ? [current.pop()] : [];
      chunks.push(current);
      current = carried;
      size = carried.reduce((n, l) => n + l.text.length, 0);
    }
    current.push(line);
    size += line.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

// Where each input's audio lies, and its first and last spoken character; [tags] are directions, not speech.
function dialogueSpans(body, count) {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = body.alignment;
  const spans = Array.from({ length: count }, () => ({ from: Infinity, to: 0, start: Infinity, end: 0 }));
  for (const segment of body.voice_segments) {
    const span = spans[segment.dialogue_input_index];
    span.from = Math.min(span.from, segment.start_time_seconds);
    span.to = Math.max(span.to, segment.end_time_seconds);
    let inTag = false;
    for (let c = segment.character_start_index; c < segment.character_end_index; c++) {
      if (characters[c] === '[') inTag = true;
      if (!inTag && /[\p{L}\p{N}]/u.test(characters[c])) {
        span.start = Math.min(span.start, starts[c]);
        span.end = Math.max(span.end, ends[c]);
      }
      if (characters[c] === ']') inTag = false;
    }
  }
  return spans;
}

const firstSound = (samples, threshold = 500) => {
  const i = samples.findIndex((v) => Math.abs(v) >= threshold);
  return i < 0 ? 0 : i;
};
const spokenText = (text) => text.replace(/\[[^\]]*\]\s*/g, '').trim();

async function buildDialogue(dir, script, voices) {
  const placed = [];
  const timeline = [];
  let cursor = LEAD_IN_MS / 1000;
  let lastSpoken = null;
  for (const [n, chunk] of dialogueChunks(script.lines).entries()) {
    const inputs = chunk.map((line) => ({ text: line.text, voice_id: voices[line.speaker].voice_id }));
    const body = await dialogue(script.model ?? 'eleven_v4', script.seed ?? config.seed, inputs);
    const bytes = Buffer.from(body.audio_base64, 'base64');
    const pcm = new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length - (bytes.length % 2)));
    const spans = dialogueSpans(body, chunk.length);
    if (n > 0) cursor += DIALOGUE_JOIN_MS / 1000;
    for (const [i, line] of chunk.entries()) {
      const span = spans[i];
      const samples = pcm.subarray(Math.round(span.from * RATE), Math.round(span.to * RATE));
      let at = cursor;
      // An interruption: the first sound of this line starts overlap_ms before the other person stops talking.
      if (line.overlap_ms && lastSpoken !== null) at = lastSpoken - line.overlap_ms / 1000 - firstSound(samples) / RATE;
      placed.push({ samples, at });
      const start = at + span.start - span.from;
      const end = at + span.end - span.from;
      timeline.push({ id: line.id, speaker: line.speaker, text: spokenText(line.text), start: round(start), end: round(end) });
      lastSpoken = end;
      cursor = at + samples.length / RATE;
    }
  }
  const duration = round(cursor + TAIL_MS / 1000);
  const mix = new Float32Array(Math.ceil(duration * RATE));
  for (const { samples, at } of placed) {
    const offset = Math.round(at * RATE);
    for (let i = 0; i < samples.length; i++) mix[offset + i] += samples[i];
  }
  const out = Buffer.alloc(mix.length * 2);
  for (let i = 0; i < mix.length; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i]))), i * 2);
  await writeFile(path.join(dir, 'audio.wav'), wav(out));
  await writeFile(path.join(dir, 'timeline.json'), `${JSON.stringify({ case: script.case, duration, lines: timeline }, null, 2)}\n`);
  await writeFile(path.join(dir, 'script.md'), scriptMarkdown(script, timeline));
  return duration;
}

// T6: the T1 audio band-limited to a phone line, with pink noise underneath.
async function buildPhoneNoise(dir, script) {
  const source = path.resolve(dir, script.from_audio);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', path.join(source, 'audio.wav'),
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.02:sample_rate=${RATE}`,
    '-filter_complex', '[0:a]highpass=f=300,lowpass=f=3400[speech];[speech][1:a]amix=inputs=2:duration=first:normalize=0[mix]',
    '-map', '[mix]', '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le',
    path.join(dir, 'audio.wav'),
  ]);
  const timeline = JSON.parse(await readFile(path.join(source, 'timeline.json'), 'utf8'));
  await writeFile(path.join(dir, 'timeline.json'), `${JSON.stringify({ ...timeline, case: script.case }, null, 2)}\n`);
}

const args = process.argv.slice(2);

if (args.includes('--list-voices')) {
  for (const v of await listVoices()) {
    console.log(`${v.name.padEnd(32)} ${v.voice_id}  ${Object.values(v.labels ?? {}).join(', ')}`);
  }
  process.exit(0);
}

const allCases = (await readdir(TESTSET, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^T\d/.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const cases = args.length ? args : allCases;
const scripts = new Map();
for (const name of cases) scripts.set(name, await loadScript(path.join(TESTSET, name)));

// Spoken cases first: T6 is made from the T1 audio.
let voices;
for (const [name, script] of scripts) {
  // Real recordings (T9, T10) are cut from a corpus, not generated.
  if (script.from_audio || script.recorded) continue;
  voices ??= await resolveVoices();
  const build = script.engine === 'dialogue' ? buildDialogue : buildSpoken;
  const duration = await build(path.join(TESTSET, name), script, voices);
  const warning = duration > MAX_SECONDS ? '  (longer than the 3-minute scope)' : '';
  console.log(`${name}: ${clock(duration)}, ${script.lines.length} lines${warning}`);
}
for (const [name, script] of scripts) {
  if (script.transform !== 'phone_noise') continue;
  await buildPhoneNoise(path.join(TESTSET, name), script);
  console.log(`${name}: phone-line version of ${path.basename(script.from_audio)}`);
}
if (voices) await writeFile(path.join(TESTSET, 'voices.resolved.json'), `${JSON.stringify(voices, null, 2)}\n`);
console.log(`Characters sent to ElevenLabs this run: ${charactersSent}`);
