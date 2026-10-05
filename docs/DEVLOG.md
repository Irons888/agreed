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
