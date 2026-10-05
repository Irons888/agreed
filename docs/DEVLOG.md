# Devlog

Times are local (EEST).

## 2026-10-05

- Read the brief. Researched Codebridge's own voice product (Lispr) and the market: Otter, Fireflies, Granola, Circleback. Takeaway: they list action items flatly. None shows a final status (not accepted / cancelled / changed) backed by a verified, playable quote. That is where this prototype focuses.
- Stack: Cloudflare Workers + Workers AI (the platform Lispr runs on). Deepgram Nova-3 with diarization for speech, gpt-oss-120b for extraction, deterministic verification in code.
- 18:10 — Wrote the test set (T1–T6): scripts and expected results, before any product code. Committed them first, so the history shows the expected outcomes predate testing.
