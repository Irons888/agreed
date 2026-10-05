import type { ReactNode } from 'react';
import type { Result } from '../../../worker/types';
import { clock, plural } from '@/lib/format';
import { Badge } from '../ui/badge';
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
    <div className="border-2 border-border-strong bg-surface">
      <div className={tone === 'danger' ? 'flex items-center gap-2 bg-danger px-5 py-2 text-surface' : 'surface-dark flex items-center gap-2 px-5 py-2'}>
        <Icon name={icon} size={14} />
        <span className="tag-label">{eyebrow}</span>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="headline max-w-3xl text-title-1 text-text">{title}</h2>
        <div className="mt-4 max-w-2xl text-body-lg text-muted">{children}</div>
        {facts && (
          <div className="mt-5 flex flex-wrap gap-2">
            {facts.map((f) => (
              <Badge key={f}>{f}</Badge>
            ))}
          </div>
        )}
        {action && <div className="mt-8 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** The product refuses instead of guessing when the input is outside its scope. */
export function DeclineState({ result, onNew }: { result: Result; onNew: () => void }) {
  return (
    <StatePanel
      icon="close"
      tone="neutral"
      eyebrow="Outside the scope · declined"
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
    <StatePanel icon="checks" tone="neutral" eyebrow="Checked · nothing to list" title="No firm commitments found">
      Nobody committed to anything, asked an open question or proposed a task. The transcript is shown so you can check.
    </StatePanel>
  );
}

export function ErrorState({ message, onRetry, onNew }: { message: string; onRetry?: () => void; onNew: () => void }) {
  return (
    <StatePanel
      icon="review"
      tone="danger"
      eyebrow="Error"
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
