#!/usr/bin/env node
// Runs the real pipeline over the test set through the HTTP API and scores every result against
// testset/*/expected.json. Nothing is cached: each run uploads the audio and waits for a fresh result.
//
//   node eval/run.mjs                              all cases, 1 run each, against http://127.0.0.1:8787
//   node eval/run.mjs --runs 5 --base https://…    5 runs per case against a deployed instance
//   node eval/run.mjs --reasoning medium T1-main   one case with another reasoning level
//
// Writes eval/reports/<timestamp>.json and .md, eval/reports/latest.json, and every full result to eval/results/<timestamp>/.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTSET = path.join(ROOT, 'testset');
const REPORTS = path.join(ROOT, 'eval', 'reports');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value;
};
const base = option('base', 'http://127.0.0.1:8787').replace(/\/$/, '');
const runs = Number(option('runs', '1'));
const reasoning = option('reasoning', 'low');
const allCases = (await readdir(TESTSET, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^T\d/.test(d.name))
  .map((d) => d.name)
  .sort();
const cases = args.length ? args : allCases;

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim();

async function loadCase(name) {
  const dir = path.join(TESTSET, name);
  let expected = await readJson(path.join(dir, 'expected.json'));
  if (expected.same_as) expected = { ...(await readJson(path.resolve(dir, expected.same_as))), case: name };
  const timeline = await readJson(path.join(dir, 'timeline.json'));
  const audio = await readFile(path.join(dir, 'audio.wav'));
  return { name, expected, timeline, audio };
}

async function runOnce({ name, audio }) {
  const started = performance.now();
  const res = await fetch(`${base}/api/runs?reasoning=${reasoning}`, {
    method: 'POST',
    body: audio,
    headers: { 'content-type': 'audio/wav', 'x-file-name': `${name}.wav` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  let error = null;
  let transcriptMs = null;
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === 'transcript') transcriptMs = performance.now() - started;
      if (event.type === 'result') result = event.result;
      if (event.type === 'error') error = event.message;
    }
  }
  return { result, error, clientMs: Math.round(performance.now() - started), transcriptMs: transcriptMs && Math.round(transcriptMs) };
}

// ---- scoring --------------------------------------------------------------

// expected.json names the reason in plain terms; the API is more specific.
const DECLINE_REASONS = { speaker_count: ['too_many_voices', 'one_voice'] };

function score(expected, timeline, result) {
  const checks = [];
  const add = (item, check, ok, detail = '') => checks.push({ item, check, ok, detail });
  const lines = new Map(timeline.lines.map((l) => [l.id, l]));

  add('(outcome)', 'outcome', result.outcome === expected.outcome, `expected ${expected.outcome}, got ${result.outcome}`);
  if (expected.outcome === 'decline') {
    const reasons = DECLINE_REASONS[expected.decline_reason] ?? [expected.decline_reason];
    add('(outcome)', 'decline reason', reasons.includes(result.decline?.reason), `got ${result.decline?.reason}`);
    add('(outcome)', 'no list', result.items.length === 0, `${result.items.length} items`);
    return checks;
  }
  for (const kind of expected.clarify ?? []) {
    add('(outcome)', `asks: ${kind}`, result.clarifications.some((c) => c.kind === kind), '');
  }
  for (const [key, name] of Object.entries(expected.speakers ?? {})) {
    const names = result.speakers.map((s) => s.name?.toLowerCase() ?? null);
    if (name) add('(speakers)', `name ${name}`, names.includes(name.toLowerCase()), names.join(', '));
    else add('(speakers)', `${key} unnamed`, names.every((n) => n === null), names.join(', '));
  }
  const gotDate = result.recordingDate?.date ?? null;
  add('(recording date)', 'recording date', gotDate === (expected.recording_date ?? null), `got ${gotDate}`);

  const overlaps = (item, lineIds) =>
    item.evidence.some((e) =>
      lineIds.some((id) => {
        const l = lines.get(id);
        return l && e.start <= l.end + 0.5 && e.end >= l.start - 0.5;
      }),
    );
  const keyed = (item, keys) => {
    const text = norm([item.title, ...item.evidence.map((e) => e.quote)].join(' '));
    return keys.some((k) => text.includes(norm(k)));
  };

  const unused = new Set(result.items);
  for (const exp of expected.items) {
    const candidates = [...unused].filter((it) => keyed(it, exp.keys) && overlaps(it, exp.evidence_lines));
    const match = candidates[0];
    if (!match) {
      if (!exp.optional) add(exp.id, 'found', false, 'missing');
      continue;
    }
    unused.delete(match);
    add(exp.id, 'found', true, match.title);
    const allowed = Array.isArray(exp.status) ? exp.status : [exp.status];
    add(exp.id, 'status', allowed.includes(match.status), `expected ${allowed.join('|')}, got ${match.status}`);
    if (exp.owner !== undefined) {
      const got = match.owner.kind === 'none' ? null : match.owner.name;
      const ok = exp.owner.name === null ? got === null : (got ?? '').toLowerCase() === exp.owner.name.toLowerCase();
      add(exp.id, 'owner', ok, `expected ${exp.owner.name}, got ${got}`);
    }
    if (exp.deadline) {
      const raw = match.deadline.raw ?? '';
      add(exp.id, 'deadline wording', norm(raw).includes(norm(exp.deadline.raw_contains)), `got "${raw}"`);
      add(exp.id, 'deadline date', (match.deadline.date ?? null) === exp.deadline.date, `expected ${exp.deadline.date}, got ${match.deadline.date}`);
      if (exp.deadline.changed_from_contains) {
        const prev = match.deadline.previous.join(' | ');
        add(exp.id, 'deadline history', norm(prev).includes(norm(exp.deadline.changed_from_contains)), `got "${prev}"`);
      }
    }
    add(exp.id, 'evidence', match.evidence.length > 0 && overlaps(match, exp.evidence_lines), `${match.evidence.length} quotes`);
  }
  for (const extra of unused) add(`extra: ${extra.title}`, 'unsupported extra', false, extra.status);
  return checks;
}

// Exclusion errors: anything the product asserted that the recording doesn't support.
function exclusionErrors(checks) {
  return checks.filter((c) => {
    if (c.check === 'unsupported extra') return true;
    if (c.check === 'status' && !c.ok && /got agreed$/.test(c.detail)) return true;
    if (c.check === 'owner' && !c.ok && /expected null/.test(c.detail)) return true;
    if (c.check === 'deadline date' && !c.ok && /expected null/.test(c.detail)) return true;
    return false;
  }).length;
}

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

// ---- main -----------------------------------------------------------------

const report = { startedAt: new Date().toISOString(), base, runs, reasoning, cases: [] };
// Full results are kept next to the report: evidence for the notes and real fixtures for Storybook.
const resultsDir = path.join(ROOT, 'eval', 'results', report.startedAt.replace(/[:.]/g, '-'));
await mkdir(resultsDir, { recursive: true });
for (const name of cases) {
  const testCase = await loadCase(name);
  const caseReport = { case: name, outcome: testCase.expected.outcome, runs: [] };
  for (let i = 1; i <= runs; i++) {
    let run;
    try {
      run = await runOnce(testCase);
    } catch (err) {
      run = { error: err.message };
    }
    if (run.result) await writeFile(path.join(resultsDir, `${name}-${i}.json`), `${JSON.stringify(run.result, null, 2)}\n`);
    const checks = run.result ? score(testCase.expected, testCase.timeline, run.result) : [];
    const failed = checks.filter((c) => !c.ok);
    const required = testCase.expected.items.filter((e) => !e.optional);
    const found = required.filter((e) => checks.some((c) => c.item === e.id && c.check === 'status' && c.ok)).length;
    const m = run.result?.metrics;
    caseReport.runs.push({
      run: i,
      error: run.error ?? null,
      pass: !run.error && failed.length === 0,
      included: required.length ? `${found}/${required.length}` : 'n/a',
      exclusionErrors: run.result ? exclusionErrors(checks) : null,
      failed,
      checks: checks.length,
      clientMs: run.clientMs ?? null,
      transcriptMs: run.transcriptMs ?? null,
      serverMs: m?.timings ?? null,
      usage: m?.usage ?? null,
      cost: m?.cost ?? null,
      items: run.result?.items.map((it) => ({
        title: it.title,
        status: it.status,
        owner: it.owner.kind === 'none' ? null : it.owner.name,
        deadline: it.deadline.raw,
        date: it.deadline.date,
        notes: it.checks.filter((c) => c.note).map((c) => c.note),
      })),
      dropped: run.result?.dropped ?? [],
    });
    const last = caseReport.runs.at(-1);
    console.log(
      `${name} #${i}: ${last.pass ? 'PASS' : 'FAIL'}  included ${last.included}  exclusion errors ${last.exclusionErrors ?? '-'}  ` +
        `${last.clientMs ?? '-'} ms  $${last.cost?.totalUsd ?? '-'}${last.error ? `  error: ${last.error}` : ''}`,
    );
    for (const f of last.failed) console.log(`    ✗ ${f.item} — ${f.check}: ${f.detail}`);
  }
  report.cases.push(caseReport);
}

const allRuns = report.cases.flatMap((c) => c.runs);
const ok = allRuns.filter((r) => !r.error);
const ratio = (included) => included.reduce((acc, r) => {
  if (r.included === 'n/a') return acc;
  const [a, b] = r.included.split('/').map(Number);
  return [acc[0] + a, acc[1] + b];
}, [0, 0]);
const [inc, req] = ratio(ok);
const audioMinutes = ok.reduce((s, r) => s + (r.usage?.audioMinutes ?? 0), 0);
const totalUsd = ok.reduce((s, r) => s + (r.cost?.totalUsd ?? 0), 0);
report.summary = {
  runs: allRuns.length,
  errors: allRuns.length - ok.length,
  passed: ok.filter((r) => r.pass).length,
  inclusion: req ? `${inc}/${req}` : 'n/a',
  exclusionErrors: ok.reduce((s, r) => s + (r.exclusionErrors ?? 0), 0),
  stability: Object.fromEntries(report.cases.map((c) => [c.case, `${c.runs.filter((r) => r.pass).length}/${c.runs.length}`])),
  timeToResultMs: { p50: percentile(ok.map((r) => r.clientMs), 50), p90: percentile(ok.map((r) => r.clientMs), 90) },
  timeToTranscriptMs: { p50: percentile(ok.map((r) => r.transcriptMs).filter(Boolean), 50) },
  retries: ok.reduce((s, r) => s + (r.usage?.retries ?? 0), 0),
  costPerRunUsd: ok.length ? Math.round((totalUsd / ok.length) * 1e6) / 1e6 : null,
  costPerAudioMinuteUsd: audioMinutes ? Math.round((totalUsd / audioMinutes) * 1e6) / 1e6 : null,
};

console.log('\nSummary:', JSON.stringify(report.summary, null, 2));

await mkdir(REPORTS, { recursive: true });
const stamp = report.startedAt.replace(/[:.]/g, '-');
await writeFile(path.join(REPORTS, `${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(REPORTS, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);

const md = [
  `# Eval ${report.startedAt}`,
  '',
  `Base: ${base} · runs per case: ${runs} · reasoning: ${reasoning}`,
  '',
  '| Case | Expected outcome | Passed runs | Included (last run) | Exclusion errors (all runs) | Time p50 |',
  '|---|---|---|---|---|---|',
  ...report.cases.map((c) => {
    const ms = c.runs.map((r) => r.clientMs).filter(Boolean);
    return `| ${c.case} | ${c.outcome} | ${c.runs.filter((r) => r.pass).length}/${c.runs.length} | ${c.runs.at(-1).included} | ${c.runs.reduce((s, r) => s + (r.exclusionErrors ?? 0), 0)} | ${percentile(ms, 50) ?? '-'} ms |`;
  }),
  '',
  '## Summary',
  '',
  '```json',
  JSON.stringify(report.summary, null, 2),
  '```',
  '',
  '## Failed checks',
  '',
  ...report.cases.flatMap((c) => c.runs.flatMap((r) => r.failed.map((f) => `- ${c.case} #${r.run}: ${f.item} — ${f.check}: ${f.detail}`))),
  '',
].join('\n');
await writeFile(path.join(REPORTS, `${stamp}.md`), md);
console.log(`\nReport: eval/reports/${stamp}.md`);
