#!/usr/bin/env node
// Builds the test-set audio from testset/*/script.json with ElevenLabs text-to-speech.
//
// Every line is synthesized on its own and stitched together with pauses, so we know
// exactly when each line starts and ends (timeline.json). Lines are cached by voice and
// text, which keeps unchanged lines byte-identical between T1 and T2.
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
  .sort();
const cases = args.length ? args : allCases;
const scripts = new Map();
for (const name of cases) scripts.set(name, await loadScript(path.join(TESTSET, name)));

// Spoken cases first: T6 is made from the T1 audio.
let voices;
for (const [name, script] of scripts) {
  if (script.from_audio) continue;
  voices ??= await resolveVoices();
  const duration = await buildSpoken(path.join(TESTSET, name), script, voices);
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
