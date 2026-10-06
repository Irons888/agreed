# Agreed

**Final commitments from a recorded conversation.** Upload a recorded two-person project discussion and get the final agreed tasks, owners, deadlines and unresolved questions. Each item is backed by a word-for-word quote you can play. This is not a meeting summary: it is a commitments list you can check.

- Live demo: https://agreed.rhanaev7-138.workers.dev
- Design system (Storybook): https://agreed.rhanaev7-138.workers.dev/storybook/
- Quality report from the latest eval: https://agreed.rhanaev7-138.workers.dev/quality
- Delivery notes (inputs, expected vs actual, failures, measurements, tools): [docs/DELIVERY_NOTES.md](docs/DELIVERY_NOTES.md) · українською: [docs/DELIVERY_NOTES.uk.md](docs/DELIVERY_NOTES.uk.md)

Scope: English, two clearly distinguishable speakers, up to 3 minutes, no overlapping speech. Built as a test task for the Codebridge Product Builder role.

## What it guarantees

- **“We could” never becomes “we will”.** A proposal nobody accepted is listed as *Not accepted*.
- **Final state wins.** A cancelled task is *Cancelled*, not active. A moved deadline shows the final one and what it replaced: “Monday”, moved from “Thursday”.
- **Nothing is guessed.**
  - If nobody took a task, it shows *No owner named*.
  - A weekday such as “by Wednesday” stays as spoken, marked *date unknown*, unless the recording states its own date or you set the call date (one click next to the deadline).
- **Every claim is checked in code.**
  - Quotes are replaced by the transcript's own words.
  - Times come from speech recognition, not from the model.
  - Statuses, owners and deadlines the quotes don't support are downgraded or removed, with a note saying why.
- **It asks or declines instead of guessing.**
  - Speakers who never say their names: it asks who is who.
  - Hedged agreements (“I'll try, no promises”): listed under *Needs your check*, not counted until you confirm.
  - Three or more voices, or a single voice: it declines and says why.

## Pages

- **New**: upload a recording or run an example call. Until you have results, it shows what you get, written out.
- **Result** (`/r/:id`): the items with ▶ quotes, the recording and the transcript. The link works for 30 days.
- **History**: every recording analysed in this browser, with its counts. No accounts: it is kept in the browser.
- **Tasks**: a board of everything from those recordings: *To check* (said with a hedge, waiting for your decision), *To do* (soonest deadline first, overdue marked), *Open questions* and *Done*. Choose which calls are on the board, filter by person, press ▶ on a card to hear the words it comes from, tick tasks off, name a voice nobody named, or edit a task. Edits stay on the board and are marked as yours; the result page keeps what the call supports.
- **Quality report** and **Design system**: for reviewers.

## Simple by default

- Each item shows its title, owner, deadline and the one quote that decides it, with ▶. Every other quote, what it does (request, acceptance…) and the code checks are under *Details*.
- Items that need your decision come right after the agreed tasks. Dropped proposals and cancelled tasks are folded under *Not counted*.
- Time, cost, removed items and the raw JSON are folded at the bottom under *How this was checked*. The test recordings, the eval and the brief's rules are on the Quality page.

## Measured

Final eval: 5 runs per test recording on the live deployment, with Scribe v2: eight recordings made for the test and two real meetings.

| | |
|---|---|
| Runs passed | **44 / 50**: 39 / 40 on the recordings made for the test; real meetings T10 5 / 5, T9 0 / 5 by the strict check |
| Real items found with the right status | **175 / 180** |
| Unsupported items added | **2**, both in the real two-person meeting (T9) |
| Time to the full verified list, p50 / p90 (declines take about 2 s) | **20.1 s / 32.8 s** |
| Time to the transcript | **2.6 s** |
| Variable cost | **$0.0048 per audio minute** at ElevenLabs and Workers AI list prices |

On real speech (T9) all three tasks are listed every run: the email and the file task agreed with the right people, and a need answered only with “Yeah.” under “To check” for the user to confirm, where the strict check expects “agreed”. Twice the model listed an explanation of a past decision as a declined proposal. Details are in the delivery notes.

With Nova-3 the same pipeline passed T1–T6 (30/30 on the live deployment, $0.0071 per audio minute) but heard T7's seven people as one voice.

Hosting is separate: Workers Paid, $5 a month.

The weak spot is the time to the full result: nearly all of it is the extraction model, and it varies between runs.
- gpt-oss-20b was tried as a faster option. It was not faster (24 s) and lost two owners, so gpt-oss-120b stays.
- Details are in the [delivery notes](docs/DELIVERY_NOTES.md).

## How it works

```
Browser                                   Cloudflare Worker                         Models
any audio/video → 16 kHz mono WAV ──────▶ store in R2 (30-day lifecycle)
length checked before upload              1. speech → words with speakers ───────▶ ElevenLabs Scribe v2 (diarize)
                                                                                    fallback: Deepgram Nova-3 on Workers AI
                                          2. turns rebuilt from word-level speakers
                                          3. scope checks: 2 voices? speech?
                                          4. items, final states, quotes ────────▶ gpt-oss-120b on Workers AI (strict JSON schema)
                                          5. verification in code (quotes, times, owners, deadlines)
                                          6. dates resolved only from a stated or confirmed recording date
◀── progress streamed as NDJSON ───────── 7. time and cost of every step → result stored in R2
result at /r/<id>, quotes play from R2 with byte ranges
```

Answers to clarifications (speaker names, recording date, confirming a hedged item) are applied in the browser with the same date module the server uses. Nothing is reprocessed.

## Run it locally

You need Node 22+ and a Cloudflare account (Workers AI is called remotely even in development). ffmpeg is needed only to rebuild the test audio.

Speech recognition uses ElevenLabs Scribe v2 when `ELEVENLABS_API_KEY` is set, and Deepgram Nova-3 on Workers AI when it is not, so the app runs without an ElevenLabs account. Nova-3 hears short turns as one voice (see the delivery notes), so set the key to reproduce the eval.

```bash
npm install
npx wrangler login
echo "ELEVENLABS_API_KEY=your-key" > .dev.vars  # optional, see above; .dev.vars is git-ignored
npm run dev                                   # app and API on http://localhost:5173
npm run storybook                             # design system on http://localhost:6006
npm run eval -- --base http://localhost:5173 --runs 5    # score the test set against the local API
npm run typecheck
```

To deploy your own copy:

```bash
npx wrangler r2 bucket create agreed-runs
npx wrangler r2 bucket lifecycle add agreed-runs expire-30-days --expire-days 30
npx wrangler secret put ELEVENLABS_API_KEY    # optional, as in development
npm run deploy                                # builds the app and Storybook, deploys to Workers
```

## Test set and eval

`testset/` holds ten recordings with expected results: eight made for this test and two excerpts of real meetings. The expected results were committed **before any product code existed**, as the git history shows. See [testset/README.md](testset/README.md).

| Case | What it checks |
|---|---|
| T1 | All five required cases, plus an unresolved question |
| T2 | T1 with one agreement changed |
| T3 | Ambiguity: no names, hedged statements; should ask |
| T4 | Relative dates with a stated recording date |
| T5 | Three voices; should decline |
| T6 | T1 over a noisy phone line |
| T7 | Seven people, 2–5 s of speech each; should decline as more than two voices. Added later, expected result committed before its first run |
| T8 | The situations of T1 spoken like a real call, 2:34: small talk, fillers, laughter, a hedged offer, two interruptions. Added later, expected result committed before its first run |
| T9 | A real meeting (AMI corpus): two colleagues plan work, overlapping and unnamed; should ask who is who and find three agreed tasks |
| T10 | A real meeting (AMI corpus): four people introduce themselves; should decline |

`npm run eval` uploads each recording to the live pipeline, scores the result against `expected.json` and writes `eval/reports/` and the full results to `eval/results/`. Nothing is cached.

## Repository

```
worker/            Cloudflare Worker: API, pipeline (asr, turns, extract, verify, dates, cost), R2 storage
src/               React app: pages, design-system components, audio helpers
src/styles/        tokens.css and app.css — the only place colours, type, lines and motion are defined
src/stories/       Storybook: Foundations (tokens, icons, content rules), components, screens
testset/           scripts, expected results, audio, timelines, and the ElevenLabs build script
eval/              eval runner, reports and full results
spikes/            throwaway experiments that informed decisions (see docs/DEVLOG.md)
docs/              DEVLOG.md (what was tried, what failed, how outputs were checked), DELIVERY_NOTES.md
```

## Reused components and own work

**Reused:**
- Cloudflare Workers, Workers AI and R2;
- the models ElevenLabs Scribe v2 (speech), gpt-oss-120b and, as a fallback, Deepgram Nova-3 (both via Workers AI);
- React, Vite and Tailwind CSS;
- Radix UI primitives, and the shadcn/ui pattern (class-variance-authority, tailwind-merge);
- Lucide icons, the Onest, Geist and Geist Mono fonts;
- zod and Storybook;
- ElevenLabs voices for the test recordings made for this test;
- two excerpts of the AMI Meeting Corpus (CC BY 4.0) as real test recordings, credited in `testset/README.md`.

**Own work:**
- the pipeline: turn building, prompt and worked example, verification rules, date resolution, cost accounting;
- the API: streaming, storage, limits;
- every interface component and screen;
- the design tokens and the Storybook documentation;
- the test-set scripts and expected results;
- the eval runner.

## Privacy and limits

- **Storage.** The recording and its result are kept in R2 for 30 days, so quotes stay playable and the result link keeps working. **Delete now** removes both immediately. Anyone with the link can open a result.
- **Processors.** The audio is sent to ElevenLabs for transcription, under their API terms; the transcript is sent to Workers AI for extraction. Nothing else leaves Cloudflare.
- **Logs.** Only timings, token counts and costs are logged, never the conversation.
- **Usage limits.** A few analyses per minute per visitor and a daily ceiling for the demo.
- **Scope.** English only, two speakers, up to 3 minutes. If recognition hears one voice, or more than two, it declines rather than guessing.
