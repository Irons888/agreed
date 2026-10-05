# Delivery notes

- Live demo: https://agreed.rhanaev7-138.workers.dev
- Design system: https://agreed.rhanaev7-138.workers.dev/storybook/
- Quality report: https://agreed.rhanaev7-138.workers.dev/quality
- Repository: this repo. Setup is in the [README](../README.md).
- Video walkthrough: _link_

## 1. Sample inputs and expected vs actual results

All test recordings, scripts, timelines and expected results are in [`testset/`](../testset). The expected results were committed before any product code existed (commit `9c14984`). T3 and T4 were later lengthened from 20 to 40 seconds, still before any product run; see section 3.

| Case | Input | Expected | Actual: latest eval, Scribe v2, 5 runs per case |
|---|---|---|---|
| T1 | Anna (PM) and Mark (backend), 1:11. Proposal never accepted, accepted task, corrected deadline, cancelled task, task with no owner, open question | 3 agreed (one with no owner, one moved from Thursday to Monday), 1 open question, dark mode not accepted, meeting room cancelled. Weekdays stay as spoken, marked “date context missing” | **5/5 pass.** All 6 items with the right status, owner and deadline every run; 0 extras. Median 25.7 s |
| T2 | T1 with one agreement changed: dark mode accepted | As T1, but dark mode agreed (Mark, “by Friday”) | **5/5 pass.** Dark mode agreed (Mark, “by Friday”); everything else as T1. Median 30.2 s |
| T3 | No introductions, every statement hedged | Asks who is speaking. No agreed tasks, no owners, no dates | **5/5 pass.** Asks who is speaking; 0 agreed tasks; the hedged fix (“by Friday”, tentative) is under “Needs your check”; no confirmed owners or calendar dates. Median 19.8 s |
| T4 | States its date (“Monday, October 5th, 2026”) | tomorrow → Oct 6, Friday → Oct 9, today → Oct 5, Wednesday next week → Oct 14 | **5/5 pass.** Oct 6, Oct 9, Oct 5, Oct 14 every run; “let's do a review” has no owner. Median 19.4 s |
| T5 | Three voices | Declines: more than two voices | **5/5 pass.** Three voices heard, declined, no list. 1.5 s |
| T6 | T1 over a noisy phone line | Same as T1 | **5/5 pass.** Same result as T1. Median 26.9 s |
| T7 | Seven people on a stand-up, 0:42, 2–5 s each. Added later; expected result committed before its first run | Declines: more than two voices. No tasks | **5/5 pass.** Seven voices heard, declined, no list. 2.5 s. With Nova-3: one voice heard, so it declined for the wrong reason |

Scoring: `eval/run.mjs` uploads each recording to the API and checks the result against `expected.json`.
- An expected item counts as found only if its key words appear and its quote falls within the expected lines of the timeline.
- Then status, owner, deadline wording, calendar date and deadline history are checked.
- Every item that matches nothing in the expected list is an unsupported extra.
- A decline must give the right reason: with more than two people in the timeline, only “more than two voices” passes.

Latest eval, Scribe v2, with the Worker running locally against the same hosted models: [`eval/reports/2026-10-05T21-02-00-081Z.md`](../eval/reports/2026-10-05T21-02-00-081Z.md), every result in `eval/results/2026-10-05T21-02-00-081Z/`. The previous final eval with Nova-3 ran on the live deployment: [`eval/reports/2026-10-05T17-21-03-651Z.md`](../eval/reports/2026-10-05T17-21-03-651Z.md).

| | Scribe v2, T1–T7 | Nova-3, T1–T6 |
|---|---|---|
| Runs passed | **35 / 35** | 30 / 30; T7 fails in a separate run: one voice heard of seven |
| Real items found with the right status | **130 / 130** | 130 / 130 |
| Unsupported items (extras, upgraded statuses, guessed owners or dates) | **0** | 0 |
| Failed requests / recovered dropped connections / retries | 0 / 0 / 0 | 0 / 0 / 0 |

## 2. What failed, and what is unfinished

**Failed along the way, now fixed.** Each item is described in [DEVLOG](DEVLOG.md).
- **Stability run v1** (stopped after 9 runs, 5 passed):
  - once, the facilitator's “let's go through what's left” became an item;
  - three times, “the privacy policy page has to be updated” — answered “Yes, that definitely needs to happen” — was marked not accepted or needs review, because the model confused *no owner* with *not agreed*.
  - Fixed with prompt rules and two verification rules (roles are checked against the words; a plain “yes” to a proposal can't be silently dropped).
- **Dropped connections.** 9 of 30 runs broke off mid-stream during a period of unstable network. The stream now sends a heartbeat, and a broken stream is recovered from storage by run id. The final eval had no drops.
- **Speaker grouping.** The speech model's own grouping glued two speakers together (section 3). Turns are now rebuilt from words.

**Still weak:**
- **Time to the full result.** Median 20 s, p90 33 s, up to 50 s on T1. Nearly all of it is the extraction model on Workers AI, and the same input can take 21 s or 50 s. A smaller model (gpt-oss-20b) was no faster and lost owners. The transcript shows after about 3 s, so the page is not empty while you wait.
- **Telling voices apart depends on recognition.** Nova-3, the first choice, heard short turns as one voice: T7 came out as 1 voice of 7, and an 18-second cut with two people as 1. Scribe v2 now separates every test recording, and on cuts it told apart a single 0.4-second “Okay.” and same-gender voices with one 1.3–1.8 s line each. But all of them are clean synthetic voices; similar voices or crosstalk on a real call may still merge. When only one voice is heard, the product declines instead of guessing.
- **A third party hears the audio.** Recognition runs at ElevenLabs, under their API terms. Without an ElevenLabs key the app falls back to Nova-3 on Workers AI, and then nothing leaves Cloudflare.
- **Synthetic test audio.** All recordings are text-to-speech; T6 adds phone-line noise, but there is no real human recording in the set.
- **History lives in the browser.** There are no accounts, so History, Tasks and the answers to clarifications (speaker names, the call date, review decisions) are kept in this browser and re-applied when a result is opened again. Another device, or a shared link, shows the original result.

**Not built:**
- a side-by-side T1/T2 comparison view;
- answering clarifications by voice;
- recording from the microphone in the browser (upload covers the brief);
- a lint rule that enforces design tokens (the rule is documented in Storybook).

## 3. How AI output was checked: one example

The speech model's own turn segmentation was wrong in a way the transcript text alone would hide.
- **How it was caught.** Deepgram Nova-3 returns both per-word speakers and grouped utterances. Checked against the test set's ground-truth `timeline.json`, every one of T1's 210 words had the right speaker, but one utterance glued Mark's introduction (“And I'm Mark…”) and Anna's next sentence into a single utterance labelled Anna.
- **Effect.** Fed to the extraction model, that misattribution produced a wrong owner: the cancelled meeting-room booking became Mark's.
- **Fix.** Turns are rebuilt from word-level speakers and Deepgram's utterances are ignored. The rebuilt transcript has 22 turns for 24 script lines; the two differences are pairs of consecutive lines by the same speaker. Since then every owner check in the gpt-oss-120b evals has passed, including all 30 runs of the final eval.

Other checks that changed decisions, all in [DEVLOG](DEVLOG.md):
- **`smart_format`** rewrote “October 5th, 2026” as “10/05/2026”, so it is off: quotes must be what was said.
- **Short turns.** Nova-3 merged voices whenever each person spoke only a few seconds: T7 with seven people became one voice. Cuts of the same file showed it was turn length, not the number of people. Scribe v2 separated all of them and is cheaper, so recognition switched; Nova-3 stays as the fallback.
- **Reasoning level.** gpt-oss-120b on “medium” reasoning labelled agreed tasks as open questions and invented an owner, so the pipeline uses “low”.

Every model claim is also verified in code on each run:
- quotes must exist in the transcript;
- an agreed task needs an acceptance or a commitment;
- an owner needs a first-person commitment or an accepted request addressed to them;
- a deadline's wording must appear in the quoted turns.

## 4. Measurements

Latest eval with Scribe v2: 35 runs, 0 errors. The Worker ran locally against the same hosted models.

| Measure | Scribe v2 (current) | Nova-3 (before, live deployment) |
|---|---|---|
| Time to the full verified result (upload → list), p50 / p90 | **19.8 s / 33.2 s** | 23.2 s / 31.5 s |
| Time to the transcript (first useful output), p50 | **2.8 s** | 1.2 s |
| Recognition time for a 71 s recording, median | 3.5 s | 1.8 s |
| Recognition time for a 3-minute recording (separate test, 3 calls) | 5.1–6.9 s | — |
| Variable cost per run (average over the test set) | **$0.0044** | $0.0061 |
| Variable cost per audio minute | **$0.0053** | $0.0071 |
| Of which recognition | about 69% ($0.0037 per minute) | about 74% ($0.0052 per minute) |
| Cost of the whole eval | about $0.16 for 35 runs | about $0.18 for 30 runs |

Scribe v2 shows the transcript about 1.6 s later and costs a quarter less. The time to the full result is about the same: almost all of it is the extraction model, which varies from run to run.

Extraction model comparison, measured with Nova-3 recognition on the same day:

| Extraction model | Runs passed (of completed) | Quality failures | Time p50 | Cost per audio minute |
|---|---|---|---|---|
| gpt-oss-120b (chosen) | 30/30 in the final eval | 0 | 23.2 s | $0.0071 |
| gpt-oss-20b | 19/21 | 2 lost owners | 24.0 s | $0.0064 |

Recognition dominates the cost, so the smaller model saves little and costs accuracy.

**Variable cost per operation**, at ElevenLabs and Workers AI list prices checked on 2026-10-05:

| Category | What | Price |
|---|---|---|
| Recognition | ElevenLabs Scribe v2; fallback: Deepgram Nova-3 on Workers AI | $0.22 per audio hour ($0.0037 per minute); fallback $0.0052 per minute |
| Reasoning | gpt-oss-120b on Workers AI | $0.35 / $0.75 per million input / output tokens; the actual neurons of each call are recorded |
| Speech synthesis | not used in the product | — |
| Retries | counted in the numbers above (one schema retry at most) | — |
| Paid intermediaries | none: ElevenLabs and Workers AI are called directly | — |

Free allowances (the daily Workers AI neurons, hours included in an ElevenLabs plan) are ignored: costs are computed at list price.

**Hosting**, separate from the variable cost:
- Workers Paid: $5 a month, which includes 10 M requests;
- R2 storage: $0.015 per GB-month. A 3-minute recording is about 5.8 MB, so the free 10 GB holds about 1,700 recordings.

**One-off cost of the test set.** About 3,000 characters of ElevenLabs text-to-speech, within its free monthly allowance. This is not an operating cost.

## 5. Exact AI tools and models

- **Building:** Claude Code with Claude Opus 5.5 (`claude-opus-5-5`) for research, planning, code, tests and copy.
- **Speech to text:** ElevenLabs Scribe v2 (`scribe_v2`), called from the Worker. Settings: `diarize: true`, `language_code: en`, `timestamps_granularity: word`, `tag_audio_events: false`.
- **Fallback speech to text:** Deepgram Nova-3, `@cf/deepgram/nova-3` on Cloudflare Workers AI, used when Scribe fails or no ElevenLabs key is set. Settings: `diarize: true`, `punctuate: true`, `smart_format: false`, `language: en`.
- **Extraction:** OpenAI gpt-oss-120b, `@cf/openai/gpt-oss-120b` on Workers AI. Settings: reasoning “low”, temperature 0, seed 7, a strict JSON schema, and one worked example from a different domain.
- **Tried and rejected:**
  - Whisper large-v3-turbo (`@cf/openai/whisper-large-v3-turbo`): 24.8 s for a 71 s file and no speakers.
  - Nova-3 `smart_format`: rewrites spoken dates.
  - Nova-3 as the main recognition: merges voices on short turns (T7: 1 voice of 7). It is now only the fallback.
- **Test audio:** ElevenLabs `eleven_multilingual_v2`, premade voices, generated line by line.

## 6. Time spent

_filled by the author_

## 7. What I would improve next

1. **Speed.**
   - Show items as they are found instead of waiting for the whole answer.
   - Measure a faster host for the same model (for example Groq) against the eval.
   - Split long conversations into overlapping windows.
2. **Save clarification answers on the server** with the result, with a small edit history, so a shared link and another device show the confirmed version. Accounts would also make History and Tasks follow the user.
3. **A bigger test set:**
   - real human recordings;
   - interruptions, sarcasm, paraphrased acceptances;
   - names misheard by recognition;
   - more than two speakers: Scribe v2 already separates the seven voices of T7, so the remaining work is names and owners for three or more people.
4. **Longer recordings and more languages:** chunked recognition; per-language rules for hedges and dates.
5. **Hand-off** of confirmed items to task trackers (Linear, Jira) through their APIs or MCP. Out of scope for this brief.
