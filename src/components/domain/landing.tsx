import type { ReactNode } from 'react';
import { Icon, type IconName } from '../ui/icon';

/** The first screen: one loud headline, one sentence, then straight to the upload. */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="surface-dark">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <h1 className="headline max-w-4xl text-display-sm sm:text-display">
          Who promised what. <span className="text-accent">And what got dropped.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-body-lg text-muted">
          Upload a recorded call between two people. You get the agreed tasks, owners, deadlines and open questions, each with the exact words you
          can play back.
        </p>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

const RULES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'notAccepted', title: '“We could” is not “we will”', text: 'A proposal nobody accepted is listed as not counted, never as a task.' },
  { icon: 'cancelled', title: 'Cancelled means cancelled', text: 'A task called off later in the call is not shown as active.' },
  { icon: 'noOwner', title: 'No guessed owners or dates', text: 'If nobody took a task or named a date, the result says so.' },
];

/** The brief's three rules, as the product applies them. */
export function Rules() {
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {RULES.map((rule) => (
        <li key={rule.title} className="border-2 border-border-strong bg-surface p-5">
          <Icon name={rule.icon} size={20} />
          <p className="heading mt-3 text-title-3 text-text">{rule.title}</p>
          <p className="mt-1 text-body text-muted">{rule.text}</p>
        </li>
      ))}
    </ul>
  );
}
