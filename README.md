# Agreed

**Final commitments from a recorded conversation.** Upload a recorded two-person project discussion and get the final agreed tasks, owners, deadlines and unresolved questions. Each item is backed by a word-for-word quote you can play. This is not a meeting summary: it is a commitments list you can check.

- Live demo: https://agreed.rhanaev7-138.workers.dev
- Design system (Storybook): https://agreed.rhanaev7-138.workers.dev/storybook/
- Quality report from the latest eval: https://agreed.rhanaev7-138.workers.dev/quality
- Delivery notes (inputs, expected vs actual, failures, measurements, tools): [docs/DELIVERY_NOTES.md](docs/DELIVERY_NOTES.md)

Scope: English, two clearly distinguishable speakers, up to 3 minutes, no overlapping speech. Built as a test task for the Codebridge Product Builder role.

## What it guarantees

- **“We could” never becomes “we will”.** A proposal nobody accepted is listed as *Not accepted*.
- **Final state wins.** A cancelled task is *Cancelled*, not active. A moved deadline shows the final date and the trail: “Thursday → Monday”.
- **Nothing is guessed.**
  - If nobody took a task, it shows *No owner named*.
  - A weekday such as “by Wednesday” stays as spoken, marked *date context missing*, unless the recording states its own date or you confirm it.
- **Every claim is checked in code.**
  - Quotes are replaced by the transcript's own words.
  - Times come from speech recognition, not from the model.
  - Statuses, owners and deadlines the quotes don't support are downgraded or removed, with a note saying why.
- **It asks or declines instead of guessing.**
  - Speakers who never say their names: it asks who is who.
  - Hedged agreements (“I'll try, no promises”): marked *Needs review*.
  - Three voices or a single voice: it declines and says why.

## How it works

```
Browser                                   Cloudflare Worker                         Workers AI
any audio/video → 16 kHz mono WAV ──────▶ store in R2 (30-day lifecycle)
length checked before upload              1. speech → words with speakers ───────▶ Deepgram Nova-3 (diarize)
                                          2. turns rebuilt from word-level speakers
                                          3. scope checks: 2 voices? speech?
                                          4. items, final states, quotes ────────▶ gpt-oss-120b (strict JSON schema)
                                          5. verification in code (quotes, times, owners, deadlines)
                                          6. dates resolved only from a stated or confirmed recording date
◀── progress streamed as NDJSON ───────── 7. time and cost of every step → result stored in R2
result at /r/<id>, quotes play from R2 with byte ranges
```

Answers to clarifications (speaker names, recording date, confirming a hedged item) are applied in the browser with the same date module the server uses. Nothing is reprocessed.

## Run it locally

You need Node 22+ and a Cloudflare account (Workers AI is called remotely even in development). ffmpeg is needed only to rebuild the test audio.

```bash
npm install
npx wrangler login
npm run dev                                   # app and API on http://localhost:5173
npm run storybook                             # design system on http://localhost:6006
npm run eval -- --base http://localhost:5173 --runs 5    # score the test set against the local API
npm run typecheck
```

To deploy your own copy:

```bash
npx wrangler r2 bucket create agreed-runs
npx wrangler r2 bucket lifecycle add agreed-runs expire-30-days --expire-days 30
npm run deploy                                # builds the app and Storybook, deploys to Workers
```

## Test set and eval

`testset/` holds six recordings with scripts and expected results. The expected results were committed **before any product code existed**, as the git history shows. See [testset/README.md](testset/README.md).

| Case | What it checks |
|---|---|
| T1 | All five required cases, plus an unresolved question |
| T2 | T1 with one agreement changed |
| T3 | Ambiguity: no names, hedged statements; should ask |
| T4 | Relative dates with a stated recording date |
| T5 | Three voices; should decline |
| T6 | T1 over a noisy phone line |

`npm run eval` uploads each recording to the live pipeline, scores the result against `expected.json` and writes `eval/reports/` and the full results to `eval/results/`. Nothing is cached.

## Repository

```
worker/            Cloudflare Worker: API, pipeline (asr, turns, extract, verify, dates, cost), R2 storage
src/               React app: pages, design-system components, audio helpers
src/styles/        tokens.css — the only place colours, type, radii, shadows and motion are defined
src/stories/       Storybook: Foundations (tokens, icons, content rules), components, screens
testset/           scripts, expected results, audio, timelines, and the ElevenLabs build script
eval/              eval runner, reports and full results
spikes/            throwaway experiments that informed decisions (see docs/DEVLOG.md)
docs/              DEVLOG.md (what was tried, what failed, how outputs were checked), DELIVERY_NOTES.md
```

## Reused components and own work

**Reused:**
- Cloudflare Workers, Workers AI and R2;
- the models Deepgram Nova-3 and gpt-oss-120b (via Workers AI);
- React, Vite and Tailwind CSS;
- Radix UI primitives, and the shadcn/ui pattern (class-variance-authority, tailwind-merge);
- Lucide icons, the Inter and JetBrains Mono fonts;
- zod and Storybook;
- ElevenLabs voices, used only to produce the test recordings.

**Own work:**
- the pipeline: turn building, prompt and worked example, verification rules, date resolution, cost accounting;
- the API: streaming, storage, limits;
- every interface component and screen;
- the design tokens and the Storybook documentation;
- the test-set scripts and expected results;
- the eval runner.

## Privacy and limits

- **Storage.** The recording and its result are kept in R2 for 30 days, so quotes stay playable and the result link keeps working. **Delete now** removes both immediately. Anyone with the link can open a result.
- **Logs.** Only timings, token counts and costs are logged, never the conversation.
- **Usage limits.** A few analyses per minute per visitor and a daily ceiling for the demo.
- **Scope.** English only, two speakers, up to 3 minutes. Recordings shorter than about 30 seconds may be heard as one voice. In that case it declines rather than guessing.
