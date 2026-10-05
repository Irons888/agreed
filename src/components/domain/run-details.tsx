import { Collapsible } from 'radix-ui';
import { useState } from 'react';
import type { Result } from '../../../worker/types';
import { seconds, usd } from '@/lib/format';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { CostBreakdown } from './metrics';

/** Everything about how the result was made, folded at the bottom: checks, removed items, time, cost, raw JSON. */
export function RunDetails({ result, clientMs, onDownload }: { result: Result; clientMs: number | null; onDownload: () => void }) {
  const [open, setOpen] = useState(false);
  const { cost, timings } = result.metrics;
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <section aria-label="How this was checked" className="border-2 border-border-strong bg-surface">
        <Collapsible.Trigger className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface-muted">
          <span>
            <span className="heading text-title-3 text-text">How this was checked</span>
            <span className="mt-0.5 block text-caption text-muted">
              Processed live in {seconds(clientMs ?? timings.totalMs)} · {usd(cost.totalUsd)} for this recording
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-text">
            {open ? 'Hide' : 'Show'}
            <Icon name="expand" size={14} className="transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </Collapsible.Trigger>
        <Collapsible.Content className="space-y-5 border-t-2 border-border px-4 py-4">
          <p className="text-body text-muted">
            After the model answered, plain code checked every item: each quote must be found word for word in the transcript, and each owner and
            deadline must be in the quoted words. Open “Details” on an item to see its checks.
          </p>
          {result.dropped.length > 0 && (
            <div>
              <p className="text-label font-semibold text-text">Removed by the checks</p>
              <ul className="mt-1 space-y-1 text-body text-muted">
                {result.dropped.map((d) => (
                  <li key={d.title}>
                    “{d.title}”: {d.reason.toLowerCase()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-label font-semibold text-text">Time and cost</p>
            <CostBreakdown metrics={result.metrics} />
          </div>
          <Button size="sm" icon="download" onClick={onDownload}>
            Download JSON
          </Button>
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}
