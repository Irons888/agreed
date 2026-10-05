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
