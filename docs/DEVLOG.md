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

### Redesign

- The first visual pass looked dated and too busy. Wrote a screen-by-screen design spec, then picked an editorial style together:
  - forest green, cream and one lime accent (softened a little after the first review); violet for open questions, orange for what needs a person;
  - square corners, 2 px lines, no shadows; dark forest bands for the header, the transcript and parts of the home page;
  - Onest for heavy uppercase headlines, Geist for text, Geist Mono for labels.
- Only tokens, primitives and components changed. The pipeline, the data and the screens' structure did not, so every screen is still built from the Storybook components.
- Checked before deploying:
  - typecheck; every screen at 1440 and 390 px, with no horizontal overflow;
  - dark theme: lime on a cream fill was unreadable in three places, so there is now a separate `--ink-accent` token (lime on forest, forest on cream);
  - Storybook docs styles were overriding the type scale, so the blocks opt out with `sb-unstyled`; the Storybook UI uses the product's colours, and its onboarding widgets are hidden.
- 22:10: deployed. One live T1 run on production gave the expected result (3 agreed, 1 open question, 2 not counted) in 33.5 s.

### Simpler by default

- Looked at the redesign as a regular user would: it worked for a demo but showed the machinery. Every card had a status tag, two ▶ buttons, the role of each quote, “Verified” marks and a checks footer; four big counters repeated the section titles; the header showed the run's cost; the home page had six test cases, a marquee, rules and numbers. The brief scores usability inside the 80% and says there is no need to sell the product, so all of that moved behind a click.
- Now:
  - a card shows the title, owner, deadline and the one quote that decides it, with ▶; every other quote, its role and the code checks are under “Details”;
  - one summary line (“3 agreed tasks · 1 open question · 2 not counted”) replaces the counters; items that need a decision come right after the agreed tasks; “Not counted” is folded;
  - the call-date question is a link next to the deadline instead of a big card above the results;
  - time, cost, removed items and JSON are folded under “How this was checked” at the bottom; the privacy note is one line;
  - the home page is one screen: headline, upload, two example calls. The six test recordings, the eval and the brief's rules are on the Quality page;
  - uppercase only for the home headline; labels are plain text; monospace only for times and money.
- Checked on localhost with live runs of T1 (desktop and phone) and T3 (asks for names, the hedged fix waits for a decision).

### Structure: History and Tasks

- Feedback on the one-screen home: good first block, but no structure, no history, nothing written out. A results tool people come back to needs somewhere to come back to.
- Added three places in the top menu:
  - **New**: the upload. Until you have results, an example of what T1 gives, written out line by line; afterwards, your recent recordings and latest tasks.
  - **History**: every recording analysed in this browser.
  - **Tasks**: everything agreed across those recordings, grouped by person (“who promised what”), then items to check and open questions. A line opens the result at that item and marks it.
- No accounts, so the history is kept in the browser: a short summary of each result plus the answers to clarifications, which are re-applied when the result is opened again. This also fixes answers being lost on reload.
- A live T1 run showed a weak main quote: the model had tagged Anna's “Perfect. Thanks.” as an acceptance, and it became the quote on the card. The main quote of a task is now the latest agreement that says the final deadline, then the owner's own words.

### T7: seven voices, and a better speech recognition

- Asked for a test far outside the scope: T7, a stand-up with seven people, 42 s, 16 lines of 2–5 s each. The expected result was committed before the first run: decline, no tasks.
- First run, Nova-3: no tasks, as expected, but the wrong reason. Nova-3 put all 117 words on one speaker, so the product said “Only one voice was detected” and gave a hint about 30 seconds of conversation.
- Cuts of the same recording, sent straight to Nova-3:

  | Cut | Length | Voices heard |
  |---|---|---|
  | Anna and Mark | 18 s | 1 |
  | Anna, Mark and Lena | 23 s | 1 |
  | All seven (T7) | 42 s | 1 |
  | All seven, every line said three times | 2:10 | 7 |

  The problem is how long each person speaks, not how many people there are. The same weakness is why T3 and T4 were lengthened to 40 s at the start.
- Is Nova-3 the best choice? Published diarization comparisons put it behind. On AssemblyAI's mixed real-world set (run by a vendor; cpWER, lower is better): AssemblyAI 30.2, ElevenLabs Scribe v2 35.3, Gladia 36.9, Nova-3 37.9.
- Scribe v2 on the same files, called directly:
  - T7: seven voices, and all 16 lines on the right person;
  - the 18 s cut: two voices; the 23 s cut: three;
  - T1: two voices, and 0 of 210 words on the wrong person against `timeline.json`; T5: three voices, 0 of 42.
  - About 2–3 s per file.
- Price: $0.22 per audio hour ($0.0037 a minute), against $0.0052 a minute for Nova-3 on Workers AI. Better and cheaper, so recognition switched:
  - Scribe v2 with `language_code: en`, `diarize`, word timestamps and no sound tags, so “(laughs)” cannot end up inside a quote;
  - if Scribe fails, Nova-3 on Workers AI takes over and the result records which one ran;
  - without an ElevenLabs key the app uses Nova-3, so the repository still runs with only a Cloudflare account;
  - `?asr=nova-3` on the API and `--asr nova-3` in the eval keep the old path for comparison.
- The eval now checks the decline reason strictly. With more than two people in the timeline, only “more than two voices” passes. Before, any speaker-count decline passed, which is how Nova-3's wrong reason got through. Under the new rule Nova-3 fails T7 and still passes T5 (`eval/reports/2026-10-05T21-01-44-654Z.md`).
- Eval with Scribe v2, 5 runs per case, the Worker running locally against the same hosted models:
  - **35/35 runs passed**, T7 included; 130/130 items with the right status, 0 unsupported items, 0 retries;
  - time to result p50 19.8 s, p90 33.2 s; transcript after 2.8 s instead of 1.2 s;
  - $0.0053 per audio minute instead of $0.0071.
- The fallback was tested with mocked responses: a rejected key goes straight to Nova-3; a server error, a rate limit or a timeout gets one more try first.
- Small fix found on the way: `?model=` and `?asr=` were checked with `in`, so `?model=toString` passed as a model name. Now `Object.hasOwn`.
- How long Scribe v2 takes, called directly, 3 calls each:
  - T1 (1:11) sent from this machine: 2.9–3.3 s; fetched by ElevenLabs from the Cloudflare demo: 2.4–3.1 s. The upload is a small part; on the deployment T1's recognition took 3.0 s (median of 5), against 3.5 s from this machine;
  - a 3-minute recording, the limit: 5.1–6.9 s;
  - Nova-3 took 1.8 s for T1.
- How much speech a voice needs, on clips cut from T1 and T7:
  - Mark's single “Okay.” (0.4 s) next to Anna was a separate voice, even in a 4-second clip; so were every other Mark line from 0.6 to 3.1 s;
  - voices of the same gender, one line of 1.3–1.8 s each: two men, two women, and four men in a 10-second clip were all told apart;
  - for comparison, Nova-3 heard 18 s of Anna and Mark as one voice.
  - The voices are synthetic and clean. Real calls with similar voices, noise or crosstalk may need more.

### Deployed with Scribe v2

- The ElevenLabs key is a Worker secret. Deployed together with the simpler screens, History and Tasks.
- Final eval on the live deployment, 5 runs per case:
  - **35/35 runs passed**; 130/130 items with the right status, 0 unsupported items, 0 retries, 0 dropped connections. Report: `eval/reports/2026-10-05T21-36-32-844Z.md`;
  - recordings that get a list (T1–T4, T6): p50 17.5 s, p90 28.0 s. With Nova-3 it was 24.5 s and 31.7 s, but that gap is the extraction model varying between runs; recognition itself is slower, and the transcript shows after 2.2 s instead of 1.2 s;
  - $0.0053 per audio minute instead of $0.0071.
- The Quality page's time tile now leaves declines out. They finish in about 2 s, and with T7 next to T5 they pulled the median down to 13.4 s.
- Storybook fixtures now come from this eval, so they show what Scribe v2 produces.

## 2026-10-06

### T8: the main call, spoken like a real one

- Feedback: the test calls sound scripted. Wrote T8 with the same situations as T1, the way people actually talk: small talk about the weekend, fillers, laughter, “I'll try… no promises”, and two interruptions. Expected result committed before any run (79eba52).
- `testset/build.mjs` can now generate a case as one dialogue (ElevenLabs text to dialogue, Eleven v4), so turns and laughter sound natural. The API returns when each character is spoken, which gives `timeline.json`; `overlap_ms` moves an interruption so it starts while the other person is still talking.
- Checked on a short sample first: `[laughs]` came out as laughter (Scribe tagged it as a sound), `[jumping in]` was not read aloud, and the two voices were separated.
- At first not generated: the account's free ElevenLabs allowance had 268 credits left, and T8 needs about 2,350. A Scribe call did not use those credits, so recognition in production was not affected. The eval and the sample list skip cases without audio.

### Tasks as a board

- Feedback on the Tasks page: the logic was weak. It only listed agreed tasks by person, nothing could be done with them, and there was no audio.
- Rebuilt it the way task boards work (Trello, Linear):
  - columns **To check** (hedged), **To do** (soonest deadline first; overdue in red, today in orange), **Open questions** and **Done**;
  - “Count as agreed” on a hedged card is the same answer the result page stores, so both pages agree;
  - a tick moves a task to Done; ▶ on every card plays its quote from that recording through one shared player;
  - a Calls list on the left chooses which recordings are on the board (all by default, untick to hide, “only” to keep one); the choice is in the address, `/tasks?calls=…`;
  - person filter chips; proposals nobody accepted and cancelled tasks are folded under Not counted.
- Names and edits, asked for next:
  - a voice nobody named can be named from its card; the name goes on every task of that voice in that call and on the call page, through the same stored answer;
  - a task can be edited: title, owner, deadline wording and date. Edits are a working copy on the board, marked “Edited by you”, with the original quote still playable and a way back to the call's version. The result page keeps what the recording supports, so the evidence never mixes with the user's changes.
- History entries saved before the board are refreshed once from the stored results, so old recordings get quotes and voice ids without being analysed again.
- Checked in the browser: hiding calls, “only”, reload with the address, naming a voice, assigning an owner, a full edit and going back, ▶, ticks, phone width.

### T8 on the live deployment

- After the top-up: 2:34, 2,344 characters. Checked with Scribe before any product run: two voices, eight chuckles and a sigh came out as sounds, no direction tag was read aloud, and about 7 of 412 words around the interruptions went to the other voice. “Sofia” is heard as “Sophia”, the same name by ear, so the expected speaker name now accepts both spellings; that change was committed before the first run.
- First product runs, 5 on the live deployment: 3/5. Twice the model listed “Add dark mode” two or three times with the same quotes; once it also missed the SSO question.
- Fix: verification keeps one copy of a repeated item. A repeat needs the same state, the same turns and a similar title, because one turn can hold two tasks. Run over every stored result, it merges only those repeats.
- Full eval with T8, 40 runs: 38/40.
  - T4 once: an item made of “It's Monday, October fifth”. Now an item whose quotes all lie inside the date sentence is removed; a task said in the same turn stays (tested on a synthetic call).
  - T8 once: “before launch” left out of the privacy policy task. Not fixed in code on purpose: verification removes unsupported deadlines but never adds one the model did not give.
- Final eval, 40 runs on the live deployment: **40/40**, 165/165 items with the right status, 0 unsupported, 0 retries. Lists p50 24.1 s, p90 41.1 s (T8 is 2½ minutes); transcript after 2.5 s; $0.0051 per audio minute. The repeat rule removed a duplicate “dark mode” in one T8 run.
- The home page's example is now T8, the call that sounds real; T1 stays on the Quality page.

### Real recordings

- Asked for real voices next to the synthetic ones. The brief wants material that can be shared, so the source is the AMI Meeting Corpus (CC BY 4.0, real project meetings, many speakers with accents).
- Found the windows with a script over the corpus's word-level transcripts: about three minutes, two voices only (a third person says at most a word or two), and words like “I'll”, “can you”, “by tomorrow”. 68 of 171 meetings have such a window; most real two-person stretches hold few commitments.
  - **T9** (EN2002d, 27:48–30:43): two colleagues plan software work, talk over each other, never say their names.
  - **T10** (ES2008a, 2:30–5:20): four people introduce themselves at a kick-off.
  - Expected results written from the corpus transcript and committed before the first run.
- First runs: T10 5/5 (declined, 3–4 voices heard). T9 0/5:
  - the expected file had guessed the voice numbering and spelled “six” where recognition writes “6”. Corrected after the run and recorded as such: owners are now given as the person in the timeline, and the eval finds that person's voice by overlap;
  - “do you wanna write him an email?” “Sure.” lost its owner: everyday request phrasing now counts;
  - a question answered on the spot was listed as open, as it was once in T3 and once in T8. Now the first real reply decides; simulated on every stored result, it removed the 5 answered questions and kept all 178 real ones.
- Final eval, T1–T10, 5 runs each on the live deployment: 44/50. The recordings made for the test 39/40 (T8 once without an owner the model left out); T10 5/5; T9 0/5. In T9 the email and the file task are found every run with the right people; “I'd need your snippets by tomorrow evening” answered only with “Yeah. Yep.” is never counted as agreed, and twice an explanation of a past decision became a declined proposal. Lists p50 20.8 s, p90 43.4 s; $0.0047 per audio minute.

