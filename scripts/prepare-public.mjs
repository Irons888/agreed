#!/usr/bin/env node
// Copies the test recordings and the latest eval report into public/, so the demo can offer
// "Try a sample" and show the Quality page. Both folders are generated and git-ignored.
import { copyFile, mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTSET = path.join(ROOT, 'testset');
const SAMPLES = path.join(ROOT, 'public', 'samples');
const QUALITY = path.join(ROOT, 'public', 'quality');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

await mkdir(SAMPLES, { recursive: true });
const cases = (await readdir(TESTSET, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^T\d/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const index = [];
for (const name of cases) {
  const dir = path.join(TESTSET, name);
  try {
    await access(path.join(dir, 'audio.wav'));
  } catch {
    console.log(`${name}: no audio yet (npm run testset:build), not offered as a sample`);
    continue;
  }
  const script = await readJson(path.join(dir, 'script.json'));
  let expected = await readJson(path.join(dir, 'expected.json'));
  if (expected.same_as) expected = { ...(await readJson(path.resolve(dir, expected.same_as))), purpose: expected.purpose };
  const timeline = await readJson(path.join(dir, 'timeline.json'));
  await copyFile(path.join(dir, 'audio.wav'), path.join(SAMPLES, `${name}.wav`));
  index.push({
    case: name,
    title: script.title,
    purpose: expected.purpose,
    outcome: expected.outcome,
    durationSec: timeline.duration,
    url: `/samples/${name}.wav`,
  });
}
await writeFile(path.join(SAMPLES, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

await mkdir(QUALITY, { recursive: true });
const latest = path.join(ROOT, 'eval', 'reports', 'latest.json');
try {
  await access(latest);
  await copyFile(latest, path.join(QUALITY, 'latest.json'));
} catch {
  // No eval has been run yet: the Quality page says so.
}
console.log(`public/: ${index.length} samples${index.length ? '' : ' (none found)'}, quality report copied`);
