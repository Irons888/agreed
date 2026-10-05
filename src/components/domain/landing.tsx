import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';

const container = 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8';

/** Three result cards as a collage: shows what the product returns before anyone uploads anything. */
function HeroCollage() {
  const cards = [
    { tag: 'Agreed', cls: 'border-agreed-border bg-agreed-bg text-agreed', title: 'Send API documentation', meta: 'Mark · “by Wednesday” · date unknown', quote: '“Yes. I’ll send the API docs by Wednesday.”', tilt: '-rotate-2' },
    { tag: 'Not accepted', cls: 'border-dashed border-border-strong text-text', title: 'Add dark mode', meta: 'Proposed, never accepted', quote: '“I’d rather keep the scope tight for this release.”', tilt: 'rotate-1' },
    { tag: 'Cancelled', cls: 'border-muted-status-border bg-muted-status-bg text-muted-status', title: 'Book meeting room', meta: 'Called off at 1:01', quote: '“So I won’t book the meeting room after all.”', tilt: '-rotate-1' },
  ];
  return (
    <div aria-hidden className="pointer-events-none hidden space-y-4 xl:block">
      {cards.map((c) => (
        <div key={c.title} className={cn('surface-light border-2 border-border-strong p-4', c.tilt)}>
          <Badge size="sm" className={c.cls}>
            {c.tag}
          </Badge>
          <p className={cn('mt-2 font-display text-title-3 font-bold', c.tag === 'Cancelled' && 'line-through')}>{c.title}</p>
          <p className="tag-label mt-1 text-subtle">{c.meta}</p>
          <p className="mt-2 border-l-4 border-speaker-1 pl-3 text-caption text-text">{c.quote}</p>
        </div>
      ))}
    </div>
  );
}

export function Hero({ onUpload, onSamples }: { onUpload: () => void; onSamples: () => void }) {
  return (
    <section className="surface-dark overflow-hidden">
      <div className={cn(container, 'grid gap-10 py-16 sm:py-24 xl:grid-hero xl:items-center')}>
        <div>
          <span className="tag-label inline-flex bg-accent px-2 py-1 text-on-accent">Live demo · every run is processed, nothing cached</span>
          <h1 className="headline mt-8 text-display-sm sm:text-display">
            Who promised what. <span className="text-accent">And what got dropped.</span>
          </h1>
          <p className="tag-label mt-12 text-subtle">From a recorded call</p>
          <p className="mt-3 max-w-xl text-body-lg text-muted">
            Upload a two-person project discussion. Get the final tasks, owners, deadlines and open questions — each backed by a quote you can play.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" icon="upload" onClick={onUpload}>
              Upload a recording
            </Button>
            <Button size="lg" icon="sample" onClick={onSamples}>
              Try a test recording
            </Button>
          </div>
        </div>
        <HeroCollage />
      </div>
      <Marquee />
    </section>
  );
}

const TICKER = [
  '“We could” is not “we will”',
  'Cancelled means cancelled',
  'No guessed owners',
  'No guessed dates',
  'Every quote is playable',
  '30/30 test runs passed',
];

export function Marquee() {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {TICKER.map((t) => (
        <span key={t} className="tag-label inline-flex items-center gap-10 whitespace-nowrap">
          {t}
          <span aria-hidden>·</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-t-2 border-border-strong bg-accent py-3 text-on-accent">
      <div className="flex w-max animate-marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function SectionHead({ eyebrow, title, text, className }: { eyebrow: string; title: ReactNode; text?: string; className?: string }) {
  return (
    <div className={cn('grid gap-6', text && 'lg:grid-cols-2 lg:items-end', className)}>
      <div>
        <p className="tag-label text-subtle">{eyebrow}</p>
        <h2 className="headline mt-3 text-display-sm sm:text-title-1">{title}</h2>
      </div>
      {text && <p className="max-w-xl text-body-lg text-muted">{text}</p>}
    </div>
  );
}

const STEPS = [
  { title: 'Who said what', text: 'Speech recognition writes down every word and which voice said it.' },
  { title: 'Final state of each item', text: 'Proposals, acceptances, changes and cancellations are followed to the end of the call.' },
  { title: 'Every quote checked', text: 'Code checks each quote against the transcript and removes what the recording does not support.' },
  { title: 'You listen and decide', text: 'Every item plays the exact words it is based on. Unclear ones wait for you.' },
];

export function HowItWorks() {
  return (
    <section id="how" className={cn(container, 'scroll-mt-8 py-20')}>
      <SectionHead eyebrow="How it works" title="Four steps. Every one checked." />
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className={cn('flex flex-col border-2 border-border-strong p-5', i === 3 ? 'bg-accent text-on-accent' : 'bg-surface')}>
            <span className="headline text-title-1 tabular">{String(i + 1).padStart(2, '0')}</span>
            <p className="headline mt-8 text-title-3">{step.title}</p>
            <p className={cn('mt-2 text-body', i === 3 ? 'text-on-accent' : 'text-muted')}>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const RULES = [
  { title: '“We could” is not “we will”', text: 'A proposal nobody accepted is listed as not accepted, never as a task.' },
  { title: 'Cancelled means cancelled', text: 'A task called off later in the call is not shown as active.' },
  { title: 'No guessed owners or dates', text: 'If nobody took a task or named a date, the result says so.' },
];

/** Lime band: the rules on the left, a real example on the right. */
export function NonGoals() {
  return (
    <section className="surface-light border-y-2 border-ink bg-accent text-on-accent">
      <div className={cn(container, 'grid gap-10 py-20 lg:grid-cols-2')}>
        <div>
          <p className="tag-label">What it will not do</p>
          <h2 className="headline mt-3 text-display-sm sm:text-title-1">No guessing. Ever.</h2>
          <ol className="mt-8 border-2 border-ink">
            {RULES.map((rule, i) => (
              <li key={rule.title} className={cn('flex gap-4 p-4', i > 0 && 'border-t-2 border-ink', i === 0 && 'bg-ink text-ink-accent')}>
                <div className="flex-1">
                  <p className="font-display text-title-3 font-bold">{rule.title}</p>
                  <p className={cn('mt-1 text-body', i === 0 ? 'text-ink-contrast' : 'text-on-accent')}>{rule.text}</p>
                </div>
                <span className="tag-label">{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="self-start border-2 border-ink">
          <div className="surface-dark space-y-4 p-5">
            <p className="tag-label text-muted">What was said</p>
            <p className="border-l-4 border-speaker-2 pl-3 text-body text-text">
              <span className="tag-label block text-muted">Mark · 0:20</span>
              “Also, we could add a dark mode while we’re at it.”
            </p>
            <p className="border-l-4 border-speaker-1 pl-3 text-body text-text">
              <span className="tag-label block text-muted">Anna · 0:24</span>
              “I’d rather keep the scope tight for this release.”
            </p>
          </div>
          <div className="surface-light border-t-2 border-ink p-5">
            <p className="tag-label text-muted">What Agreed returns</p>
            <div className="mt-4 border-2 border-dashed border-border-strong p-4">
              <Badge size="sm" icon="notAccepted" className="border-dashed border-border-strong">
                Not accepted
              </Badge>
              <p className="mt-2 font-display text-title-3 font-bold text-muted">Add dark mode</p>
              <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
                <Icon name="info" size={14} />
                Listed under “Not counted”, not as a task.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export type Measured = { passed: string; unsupported: string; time: string; cost: string };

/** The latest eval in four big numbers, like a price list. */
export function MeasuredBand({ measured, onQuality }: { measured: Measured; onQuality: () => void }) {
  const tiles: [string, string, string][] = [
    ['Test runs passed', measured.passed, 'five runs of each test recording'],
    ['Invented items', measured.unsupported, 'extras, upgraded statuses, guessed owners or dates'],
    ['To the full result', measured.time, 'median; the transcript appears after about a second'],
    ['Per audio minute', measured.cost, 'at Workers AI list prices'],
  ];
  return (
    <section className="surface-dark">
      <div className={cn(container, 'py-20')}>
        <SectionHead
          eyebrow="Measured, not promised"
          title="Numbers from the live demo"
          text="Every test recording is uploaded to this deployment and scored against an expected list written before the product existed."
        />
        <div className="mt-10 grid gap-0.5 border-2 border-border-strong bg-border-strong sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(([label, value, sub], i) => (
            <div key={label} className={cn('p-5', i === 0 ? 'bg-accent text-on-accent' : 'bg-bg text-text')}>
              <p className="tag-label">{label}</p>
              <p className="numeral mt-10 text-display-sm">{value}</p>
              <p className={cn('mt-2 text-caption', i === 0 ? 'text-on-accent' : 'text-muted')}>{sub}</p>
            </div>
          ))}
        </div>
        <Button className="mt-8" iconAfter="next" onClick={onQuality}>
          Open the quality report
        </Button>
      </div>
    </section>
  );
}
