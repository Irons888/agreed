import { Icon, type IconName } from '../ui/icon';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'waveform', title: 'Who said what', text: 'Speech recognition writes down every word and which voice said it.' },
  { icon: 'changed', title: 'Final state of each item', text: 'Proposals, acceptances, changes and cancellations are followed to the end of the conversation.' },
  { icon: 'verified', title: 'Every quote checked', text: 'Code checks each quote against the transcript and removes anything the recording does not support.' },
  { icon: 'play', title: 'You listen and decide', text: 'Each item plays the exact words it is based on. Unclear ones wait for your confirmation.' },
];

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-8">
      <h2 id="how-title" className="text-title-2 font-semibold text-text">
        How it works
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-card border border-border bg-surface p-4">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-muted text-muted">
              <Icon name={step.icon} size={16} />
            </span>
            <p className="mt-3 text-label font-semibold text-text">
              <span className="font-mono text-subtle">{i + 1}.</span> {step.title}
            </p>
            <p className="mt-1 text-body text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const RULES = [
  { title: '“We could” is not “we will”', text: 'A proposal nobody accepted is listed as not accepted, never as a task.' },
  { title: 'Cancelled means cancelled', text: 'A task called off later in the conversation is not shown as active.' },
  { title: 'No guessed owners or dates', text: 'If nobody took a task or named a date, the result says so. Weekdays stay as spoken unless the recording says what day it was.' },
];

export function NonGoals() {
  return (
    <section aria-labelledby="rules-title">
      <h2 id="rules-title" className="text-title-2 font-semibold text-text">
        What it will not do
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {RULES.map((rule) => (
          <li key={rule.title} className="rounded-card border border-border bg-surface p-4">
            <p className="text-label font-semibold text-text">{rule.title}</p>
            <p className="mt-1 text-body text-muted">{rule.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
