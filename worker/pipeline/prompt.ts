// Instructions and one worked example for the extraction model.
// The example is deliberately from a different domain and phrased differently from the test set.

export const STATUSES = ['agreed', 'not_accepted', 'cancelled', 'needs_review', 'open_question'] as const;

export const ROLES = [
  'proposal',
  'request',
  'commitment',
  'acceptance',
  'rejection',
  'hedge',
  'deadline_change',
  'cancellation',
  'question',
  'no_answer',
] as const;

export const systemPrompt = (reasoning: string) => `Reasoning: ${reasoning}

You read the transcript of a recorded project discussion and return the FINAL state of every task, proposal and unresolved question in it. This is not a summary: only items, each backed by word-for-word quotes.

The transcript has one line per speaker turn: [turn time speaker] text, for example [u7 0:41.2 S2] Yes, I'll send it.
S1, S2 are voices detected in the audio. Speech recognition can make small mistakes.

speakers: one entry per voice. name is the name that voice gives for ITSELF ("I'm Anna", "this is Mark"), with that turn and quote. If a voice never introduces itself, name, intro_turn and intro_quote are null. Do not infer a name from how others address that voice.

recording_date: only if someone states today's date in the recording ("It's Monday, October 5th"). Give it as YYYY-MM-DD with the turn and the quote. Otherwise date, turn and quote are null. Never use any other date.

items: one item per distinct task, proposal or question. Merge every mention of the same thing into one item that shows its FINAL state:
- agreed: someone committed ("I'll do it"), or accepted a request addressed to them ("Can you…?" "Yes"), or both clearly agreed that it must be done.
- not_accepted: proposed or suggested ("we could", "what if", "maybe we should") and never accepted by the end: declined, deferred or ignored.
- cancelled: agreed first, then explicitly called off later. Never report it as agreed.
- needs_review: the acceptance is hedged or conditional ("I'll try", "might", "maybe", "no promises", "if I have time"), or you cannot tell whether it was agreed.
- open_question: a question about the work that is still unanswered at the end. Do not turn it into a task unless someone commits to finding out.
Greetings, introductions and small talk are not items.

owner_speaker: the voice that committed, or that accepted a request addressed to it (S1, S2…). For needs_review, the voice that hedged.
owner_name: a named person who is not in the call and was given the task ("Lisa will send it"); otherwise null.
If nobody took the task ("we need to", "someone should", "let's", "it has to be done"), both are null. Never guess an owner.

deadline: the final agreed deadline, word for word as spoken ("by Wednesday", "Monday", "before launch"), or null if none was agreed. Never convert it to a date. If an earlier deadline was replaced, put the earlier wording in previous_deadlines.

evidence: the turns that prove the final state, in time order. quote is a contiguous span copied word for word from that turn, usually one sentence. role is one of: ${ROLES.join(', ')}. Always include the turn that decides the final state: the acceptance or commitment for agreed, the cancellation for cancelled, the rejection or the unanswered proposal for not_accepted, the hedge for needs_review, the question for open_question.

why: one short sentence explaining the final state, citing turn ids.

Never upgrade "we could" to agreed, never keep a cancelled task as agreed, never invent owners or deadlines.`;

export const EXAMPLE_TRANSCRIPT = `[u1 0:00.4 S1] Hi, this is Tom, I manage the bakery.
[u2 0:02.5 S2] And I'm Sara from the front counter.
[u3 0:04.8 S2] What if we also start a loyalty card?
[u4 0:07.0 S1] Maybe later, not this season.
[u5 0:09.1 S1] I'll ask the bank about a new card terminal tomorrow.
[u6 0:12.0 S2] Great.
[u7 0:13.2 S1] Sara, could you print the new menus?
[u8 0:15.0 S2] Sure, I'll print them.
[u9 0:16.4 S2] Let's open the second counter on the first.
[u10 0:18.9 S1] The first is too early. The eighth?
[u11 0:21.0 S2] Okay, the eighth.
[u12 0:22.6 S1] Someone has to clean the storage room before the inspection.
[u13 0:25.7 S2] Agreed.
[u14 0:26.9 S2] Who is covering the Saturday shift?
[u15 0:28.8 S1] Not decided yet.
[u16 0:30.2 S1] Actually, forget the menus. The designer is changing them anyway.
[u17 0:33.5 S2] Okay, I won't print them.
[u18 0:35.0 S2] I might be able to fix the oven light this week.
[u19 0:37.6 S1] Our accountant Lisa will send the tax form by Friday.
[u20 0:40.2 S2] Good.`;

export const EXAMPLE_OUTPUT = {
  speakers: [
    { label: 'S1', name: 'Tom', intro_turn: 'u1', intro_quote: 'this is Tom' },
    { label: 'S2', name: 'Sara', intro_turn: 'u2', intro_quote: "I'm Sara" },
  ],
  recording_date: { date: null, turn: null, quote: null },
  items: [
    {
      title: 'Start a loyalty card',
      status: 'not_accepted',
      owner_speaker: null,
      owner_name: null,
      deadline: null,
      previous_deadlines: [],
      evidence: [
        { turn: 'u3', role: 'proposal', quote: 'What if we also start a loyalty card?' },
        { turn: 'u4', role: 'rejection', quote: 'Maybe later, not this season.' },
      ],
      why: 'Sara proposed it in u3 and Tom deferred it in u4; nobody accepted it.',
    },
    {
      title: 'Ask the bank about a new card terminal',
      status: 'agreed',
      owner_speaker: 'S1',
      owner_name: null,
      deadline: 'tomorrow',
      previous_deadlines: [],
      evidence: [
        { turn: 'u5', role: 'commitment', quote: "I'll ask the bank about a new card terminal tomorrow." },
        { turn: 'u6', role: 'acceptance', quote: 'Great.' },
      ],
      why: 'Tom committed in u5 and Sara agreed in u6.',
    },
    {
      title: 'Print the new menus',
      status: 'cancelled',
      owner_speaker: 'S2',
      owner_name: null,
      deadline: null,
      previous_deadlines: [],
      evidence: [
        { turn: 'u7', role: 'request', quote: 'Sara, could you print the new menus?' },
        { turn: 'u8', role: 'acceptance', quote: "Sure, I'll print them." },
        { turn: 'u16', role: 'cancellation', quote: 'Actually, forget the menus.' },
        { turn: 'u17', role: 'acceptance', quote: "Okay, I won't print them." },
      ],
      why: 'Sara accepted in u8, but Tom called it off in u16 and she confirmed in u17.',
    },
    {
      title: 'Open the second counter',
      status: 'agreed',
      owner_speaker: null,
      owner_name: null,
      deadline: 'the eighth',
      previous_deadlines: ['on the first'],
      evidence: [
        { turn: 'u9', role: 'proposal', quote: "Let's open the second counter on the first." },
        { turn: 'u10', role: 'deadline_change', quote: 'The first is too early. The eighth?' },
        { turn: 'u11', role: 'acceptance', quote: 'Okay, the eighth.' },
      ],
      why: 'Both agreed to open it and moved the date from the first to the eighth (u10, u11); nobody was named to do it.',
    },
    {
      title: 'Clean the storage room',
      status: 'agreed',
      owner_speaker: null,
      owner_name: null,
      deadline: 'before the inspection',
      previous_deadlines: [],
      evidence: [
        { turn: 'u12', role: 'proposal', quote: 'Someone has to clean the storage room before the inspection.' },
        { turn: 'u13', role: 'acceptance', quote: 'Agreed.' },
      ],
      why: 'Both agreed it must happen (u12, u13), but nobody took it.',
    },
    {
      title: 'Who covers the Saturday shift',
      status: 'open_question',
      owner_speaker: null,
      owner_name: null,
      deadline: null,
      previous_deadlines: [],
      evidence: [
        { turn: 'u14', role: 'question', quote: 'Who is covering the Saturday shift?' },
        { turn: 'u15', role: 'no_answer', quote: 'Not decided yet.' },
      ],
      why: 'Asked in u14 and still undecided in u15.',
    },
    {
      title: 'Fix the oven light',
      status: 'needs_review',
      owner_speaker: 'S2',
      owner_name: null,
      deadline: 'this week',
      previous_deadlines: [],
      evidence: [{ turn: 'u18', role: 'hedge', quote: 'I might be able to fix the oven light this week.' }],
      why: 'Sara only said she might do it (u18); that is not a firm commitment.',
    },
    {
      title: 'Send the tax form',
      status: 'agreed',
      owner_speaker: null,
      owner_name: 'Lisa',
      deadline: 'by Friday',
      previous_deadlines: [],
      evidence: [
        { turn: 'u19', role: 'commitment', quote: 'Our accountant Lisa will send the tax form by Friday.' },
        { turn: 'u20', role: 'acceptance', quote: 'Good.' },
      ],
      why: 'Tom said Lisa, who is not on the call, will send it by Friday, and Sara agreed (u19, u20).',
    },
  ],
};
