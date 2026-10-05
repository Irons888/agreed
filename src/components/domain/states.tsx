import type { ReactNode } from 'react';
import type { Result } from '../../../worker/types';
import { clock, plural } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';
import { Icon, type IconName } from '../ui/icon';

function StatePanel({ icon, tone, eyebrow, title, children, facts, action }: {
  icon: IconName;
  tone: 'danger' | 'neutral';
  eyebrow: string;
  title: string;
  children: ReactNode;
  facts?: string[];
  action?: ReactNode;
}) {
  return (
    <div className={cn('border-2 bg-surface p-6 sm:p-8', tone === 'danger' ? 'border-danger' : 'border-border-strong')}>
      <p className={cn('flex items-center gap-2 text-caption font-semibold', tone === 'danger' ? 'text-danger' : 'text-muted')}>
        <Icon name={icon} size={16} />
        {eyebrow}
      </p>
      <h2 className="heading mt-3 max-w-3xl text-title-1 text-text">{title}</h2>
      <div className="mt-3 max-w-2xl text-body-lg text-muted">{children}</div>
      {facts && <p className="mt-3 text-caption text-subtle">{facts.join(' · ')}</p>}
      {action && <div className="mt-6 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/** The product refuses instead of guessing when the input is outside its scope. */
export function DeclineState({ result, onNew }: { result: Result; onNew: () => void }) {
  return (
    <StatePanel
      icon="close"
      tone="neutral"
      eyebrow="Declined: outside what this prototype handles"
      title="Can't build a reliable list from this recording"
      facts={[plural(result.speakers.length, 'voice'), clock(result.durationSec), plural(result.turns.length, 'turn')]}
      action={
        <Button variant="primary" size="lg" icon="upload" onClick={onNew}>
          Try another recording
        </Button>
      }
    >
      {result.decline?.message}
    </StatePanel>
  );
}

export function EmptyResult() {
  return (
    <StatePanel icon="checks" tone="neutral" eyebrow="Nothing to list" title="No firm commitments found">
      Nobody committed to anything, asked an open question or proposed a task. The transcript is shown so you can check.
    </StatePanel>
  );
}

export function ErrorState({ message, onRetry, onNew }: { message: string; onRetry?: () => void; onNew: () => void }) {
  return (
    <StatePanel
      icon="review"
      tone="danger"
      eyebrow="Something went wrong"
      title="Processing failed"
      action={
        <>
          {onRetry && (
            <Button variant="primary" size="lg" icon="back" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button size="lg" onClick={onNew}>
            New recording
          </Button>
        </>
      }
    >
      {message}
    </StatePanel>
  );
}
