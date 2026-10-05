# Devlog

Times are local (EEST).

## 2026-10-05

- Read the brief. Researched Codebridge's own voice product (Lispr) and the market: Otter, Fireflies, Granola, Circleback. Takeaway: they list action items flatly. None shows a final status (not accepted / cancelled / changed) backed by a verified, playable quote. That is where this prototype focuses.
- Stack: Cloudflare Workers + Workers AI (the platform Lispr runs on). Deepgram Nova-3 with diarization for speech, gpt-oss-120b for extraction, deterministic verification in code.
- 18:10 — Wrote the test set (T1–T6): scripts and expected results, before any product code. Committed them first, so the history shows the expected outcomes predate testing.
- 18:40 — Generated the test audio with ElevenLabs (2,075 characters). T1 is 1:11.

### Spike: Workers AI speech-to-text (`spikes/workers-ai`)

- Nova-3 with `diarize` returns a speaker for every word, although the published output schema doesn't list the field.
- T1: all 210 words attributed to the right person, checked against `timeline.json`. 2.0 s for 71 s of audio.
- T5 (three people): 3 voices detected. T6 (noisy phone line): 2 voices, transcript intact.
- Clips of about 20 s merge both voices into one; the first 30 s of T1 already separate correctly. T3 and T4 were 20 s, unrealistically short for a project discussion. Extended them to about 40 s before any product run; both now separate perfectly. Short clips must be handled honestly in the product: planned "only one voice detected" clarification.
- Deepgram's own utterances sometimes glue two speakers together (Mark's introduction landed inside Anna's utterance). Turns rebuilt from word-level speakers match the script exactly: 22 turns for 24 lines, where two pairs are the same speaker. Decision: build turns from words, ignore Deepgram utterances.
- `smart_format` rewrote "October 5th, 2026" as "10/05/2026", which is ambiguous and not what was said. Decision: off; keep `punctuate`.
- Whisper large-v3-turbo on Workers AI: 24.8 s for the same file, and no speakers. Not used.

### Spike: gpt-oss-120b on Workers AI

- `response_format` with a strict JSON schema works. `usage` reports tokens and neurons, so the cost of every call can be measured.
- Bare prompt on T1 transcript:
  - reasoning "low": 16 s, 4 of 6 items fully right. The privacy policy update became `needs_review` and lost "before launch".
  - reasoning "medium": 25–33 s, worse and unstable between runs. Agreed tasks were labelled as open questions, and one owner was invented.
- Next: a real prompt with definitions and an example, verification in code, and stability measured over repeated runs.

### Pipeline v1 and the first eval

- 19:10: pipeline v1 works end to end through `POST /api/runs` (streamed progress):
  1. turns rebuilt from word-level speakers;
  2. gpt-oss-120b with reasoning "low", temperature 0 and one worked example from a different domain (a bakery, phrased unlike the test set);
  3. every claim verified in code: quotes replaced by transcript words, times from recognition, unsupported status, owner or deadline downgraded or removed with a note;
  4. dates resolved deterministically, and only with a recording date.
- First eval, one run per case: all 6 cases pass.
  - Inclusion 26/26, 0 exclusion errors.
  - Time to result: T1 17 s, T4 9 s, T3 48 s. Extraction is 85–95% of it, and model latency varies a lot between calls.
  - Transcript ready after about 1–2 s.
  - Cost at list prices: about $0.007 per audio minute (T1: $0.0082 for 71 s).
- Next: stability over 5 runs per case. This needs Workers Paid: the free allocation is 10,000 neurons a day, and a T1 run uses about 745.

### Interface and design system

- 19:31: Web app works end to end in the browser.
  - Any audio or video is decoded in the browser and turned into 16 kHz mono WAV; length is checked before upload.
  - Progress streams step by step; the transcript appears after about 2 s.
  - Result: cards by final status; owner and deadline chips that show "No owner named" and "date context missing"; the deadline-change trail; ▶ on every quote, which plays exactly those words; quotes highlighted in the transcript; waveform with speaker colours and item markers.
  - Clarifications are answered in place, with no reprocessing: speaker names, recording date (the same date module as the server), confirming hedged items.
- Storybook 10: Foundations read from the tokens (colours, type, spacing, icons, content rules); every component and screen has stories with every state, and they render a real T1 result from the eval. The accessibility addon reports 0 violations on the checked stories. No horizontal overflow at 375 px.
- Latency is the weak point: the same T1 extraction took 15 s on one run and 44 s on another, with similar token counts. Workers AI throughput for gpt-oss-120b varies. The stability eval will measure p50 and p90; a faster model or provider is the obvious lever.

### Deploy and the first stability run

- Deployed to https://agreed.rhanaev7-138.workers.dev (Workers, R2 with a 30-day lifecycle rule, rate limit and daily cap).
- Stability run v1, 5 runs per case on the live deployment, stopped after 9 runs because two failure patterns were already clear. Log: `eval/results/2026-10-05T16-40-19-770Z/eval-v1-partial.log`.
  1. T1 run 5: an extra item, “General review of remaining items”, made from the facilitator's “Let's go through what's left”. Meeting navigation is now listed as not an item.
  2. T2 runs 1, 3 and 4: “privacy policy” was marked not_accepted or needs_review. The model wrote “no one committed to do it”, mixing up *no owner* with *not agreed*, and labelled the reply “Yes. That definitely needs to happen.” as a hedge. Fixes:
     - the prompt now says that an agreed task can have no owner;
     - a role is corrected by its words: an affirmative reply with no hedge words is an acceptance;
     - not_accepted with a plain “yes” reply and no rejection becomes needs_review instead of silently dropping the task.
- 19:46: deployed the fixes; started the final 5-run eval for gpt-oss-120b and, for comparison, gpt-oss-20b.

### Final eval, model comparison and dropped connections

- Eval after the fixes, 5 runs per case, gpt-oss-120b and gpt-oss-20b running at the same time on the live deployment.
  - gpt-oss-120b: every completed run passed. Inclusion 92/92, 0 unsupported items; T1 5/5, T2 5/5. Report: `eval/reports/2026-10-05T16-46-19-547Z.md`.
  - gpt-oss-20b: T1 lost the staging-demo owner twice; time p50 24 s, the same as 120b. Not worth the quality loss. Report: `eval/reports/2026-10-05T16-46-19-576Z.md`.
- 9 of 30 runs in each eval broke off mid-stream (`terminated`, `fetch failed`). The failures cluster in time, not by case: even the 1-second decline case was hit. `wrangler tail` from the same machine also kept losing its keep-alive, and a deploy took 90 s instead of 12. The likely cause is the network between this machine and Cloudflare dropping long, quiet connections while the model thinks.
- 20:21: made the product robust to that, which mobile users need anyway:
  - the server sends a heartbeat line every 5 s;
  - if the stream still breaks, the app (and the eval) fetch the stored result by its run id instead of failing;
  - recoveries are counted separately in the report.
- 20:34: final eval (gpt-oss-120b, 5 runs per case, live deployment, single stream):
  - **30/30 runs passed**, 130/130 items with the right status, 0 unsupported items, 0 dropped connections, 0 retries;
  - time to result p50 23.2 s, p90 31.5 s; transcript after 1.2 s;
  - $0.0071 per audio minute, about 74% of it recognition.
- Storybook now renders real T1, T3, T4 and T5 results from this eval. README and delivery notes carry the final numbers.
