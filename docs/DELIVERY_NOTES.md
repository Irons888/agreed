# Delivery notes

- Live demo: https://agreed.rhanaev7-138.workers.dev
- Design system: https://agreed.rhanaev7-138.workers.dev/storybook/
- Quality report: https://agreed.rhanaev7-138.workers.dev/quality
- Repository: this repo. Setup is in the [README](../README.md).
- Video walkthrough: _link_

## 1. Sample inputs and expected vs actual results

All test recordings, scripts, timelines and expected results are in [`testset/`](../testset). The expected results were committed before any product code existed (commit `9c14984`). T3 and T4 were later lengthened from 20 to 40 seconds, still before any product run; see section 3.

| Case | Input | Expected | Actual (5 runs on the live deployment) |
|---|---|---|---|
| T1 | Anna (PM) and Mark (backend), 1:11. Proposal never accepted, accepted task, corrected deadline, cancelled task, task with no owner, open question | 3 agreed (one with no owner, one moved from Thursday to Monday), 1 open question, dark mode not accepted, meeting room cancelled. Weekdays stay as spoken, marked “date context missing” | _filled from eval_ |
| T2 | T1 with one agreement changed: dark mode accepted | As T1, but dark mode agreed (Mark, “by Friday”) | _filled from eval_ |
| T3 | No introductions, every statement hedged | Asks who is speaking. No agreed tasks, no owners, no dates | _filled from eval_ |
| T4 | States its date (“Monday, October 5th, 2026”) | tomorrow → Oct 6, Friday → Oct 9, today → Oct 5, Wednesday next week → Oct 14 | _filled from eval_ |
| T5 | Three voices | Declines: more than two voices | _filled from eval_ |
| T6 | T1 over a noisy phone line | Same as T1 | _filled from eval_ |

Scoring: `eval/run.mjs` uploads each recording to the API and checks the result against `expected.json`.
- An expected item counts as found only if its key words appear and its quote falls within the expected lines of the timeline.
- Then status, owner, deadline wording, calendar date and deadline history are checked.
- Every item that matches nothing in the expected list is an unsupported extra.

Reports: `eval/reports/`. Full results of every run: `eval/results/`.

## 2. What failed, and what is unfinished

_filled at the end_

## 3. How AI output was checked: one example

The speech model's own turn segmentation was wrong in a way the transcript text alone would hide.
- **How it was caught.** Deepgram Nova-3 returns both per-word speakers and grouped utterances. Checked against the test set's ground-truth `timeline.json`, every one of T1's 210 words had the right speaker, but one utterance glued Mark's introduction (“And I'm Mark…”) and Anna's next sentence into a single utterance labelled Anna.
- **Effect.** Fed to the extraction model, that misattribution produced a wrong owner: the cancelled meeting-room booking became Mark's.
- **Fix.** Turns are rebuilt from word-level speakers and Deepgram's utterances are ignored. The rebuilt transcript has 22 turns for 24 script lines; the two differences are pairs of consecutive lines by the same speaker. Owners have been right on every run since.

Other checks that changed decisions, all in [DEVLOG](DEVLOG.md):
- **`smart_format`** rewrote “October 5th, 2026” as “10/05/2026”, so it is off: quotes must be what was said.
- **Short clips.** On clips of about 20 seconds Nova-3 merged both voices, which is why the product declines single-voice input.
- **Reasoning level.** gpt-oss-120b on “medium” reasoning labelled agreed tasks as open questions and invented an owner, so the pipeline uses “low”.

Every model claim is also verified in code on each run:
- quotes must exist in the transcript;
- an agreed task needs an acceptance or a commitment;
- an owner needs a first-person commitment or an accepted request addressed to them;
- a deadline's wording must appear in the quoted turns.

## 4. Measurements

_filled from the stability eval: time to useful result p50/p90, time to transcript, cost per run and per audio minute_

**Variable cost per operation**, at Workers AI list prices checked on 2026-10-05:

| Category | What | Price |
|---|---|---|
| Recognition | Deepgram Nova-3 on Workers AI | $0.0052 per audio minute |
| Reasoning | gpt-oss-120b on Workers AI | $0.35 / $0.75 per million input / output tokens; the actual neurons of each call are recorded |
| Speech synthesis | not used in the product | — |
| Retries | counted in the numbers above (one schema retry at most) | — |
| Paid intermediaries | none: Workers AI is called directly | — |

The free daily Workers AI allowance is ignored: costs are computed at list price.

**Hosting**, separate from the variable cost:
- Workers Paid: $5 a month, which includes 10 M requests;
- R2 storage: $0.015 per GB-month. A 3-minute recording is about 5.8 MB, so the free 10 GB holds about 1,700 recordings.

**One-off cost of the test set.** About 3,000 characters of ElevenLabs text-to-speech, within its free monthly allowance. This is not an operating cost.

## 5. Exact AI tools and models

- **Building:** Claude Code with Claude Opus 5.5 (`claude-opus-5-5`) for research, planning, code, tests and copy.
- **Speech to text:** Deepgram Nova-3, `@cf/deepgram/nova-3` on Cloudflare Workers AI. Settings: `diarize: true`, `punctuate: true`, `smart_format: false`, `language: en`.
- **Extraction:** OpenAI gpt-oss-120b, `@cf/openai/gpt-oss-120b` on Workers AI. Settings: reasoning “low”, temperature 0, seed 7, a strict JSON schema, and one worked example from a different domain.
- **Tried and rejected:**
  - Whisper large-v3-turbo (`@cf/openai/whisper-large-v3-turbo`): 24.8 s for a 71 s file and no speakers.
  - Nova-3 `smart_format`: rewrites spoken dates.
- **Test audio:** ElevenLabs `eleven_multilingual_v2`, premade voices, generated line by line.

## 6. Time spent

_filled by the author_

## 7. What I would improve next

_filled at the end_
