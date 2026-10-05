import type { ReactNode } from 'react';
import type { Result } from '../../../worker/types';
import { clock, plural } from '@/lib/format';
import { Button } from '../ui/button';
import { Icon, type IconName } from '../ui/icon';

function StatePanel({ icon, tone, title, children, action }: { icon: IconName; tone: 'danger' | 'neutral'; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-panel border border-border bg-surface p-6 text-center">
      <span
        className={
          tone === 'danger'
            ? 'mx-auto inline-flex size-11 items-center justify-center rounded-full bg-danger-bg text-danger'
            : 'mx-auto inline-flex size-11 items-center justify-center rounded-full bg-surface-muted text-muted'
        }
      >
        <Icon name={icon} size={20} />
      </span>
      <h2 className="mt-4 text-title-2 font-semibold text-text">{title}</h2>
      <div className="mx-auto mt-2 max-w-lg text-body text-muted">{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** The product refuses instead of guessing when the input is outside its scope. */
export function DeclineState({ result, onNew }: { result: Result; onNew: () => void }) {
  return (
    <StatePanel
      icon="close"
      tone="neutral"
      title="Can't build a reliable list from this recording"
      action={
        <Button variant="primary" icon="upload" onClick={onNew}>
          Try another recording
        </Button>
      }
    >
      <p>{result.decline?.message}</p>
      <p className="mt-3 text-caption text-subtle">
        Heard: {plural(result.speakers.length, 'voice')} · {clock(result.durationSec)} · {plural(result.turns.length, 'turn')}
      </p>
    </StatePanel>
  );
}

export function EmptyResult() {
  return (
    <StatePanel icon="checks" tone="neutral" title="No firm commitments found">
      Nobody committed to anything, asked an open question or proposed a task. The transcript is shown so you can check.
    </StatePanel>
  );
}

export function ErrorState({ message, onRetry, onNew }: { message: string; onRetry?: () => void; onNew: () => void }) {
  return (
    <StatePanel
      icon="review"
      tone="danger"
      title="Processing failed"
      action={
        <div className="flex gap-2">
          {onRetry && (
            <Button variant="primary" icon="back" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button onClick={onNew}>New recording</Button>
        </div>
      }
    >
      {message}
    </StatePanel>
  );
}
