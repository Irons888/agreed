import type { ReactNode } from 'react';
import type { Result, Speaker } from '../../../worker/types';
import { clock, seconds, usd } from '@/lib/format';
import { Icon } from '../ui/icon';
import { SpeakerName } from './speaker';

export function RunHeader({
  fileName,
  durationSec,
  speakers,
  result,
  clientMs,
  actions,
}: {
  fileName: string;
  durationSec: number;
  speakers: Speaker[];
  result?: Result | null;
  clientMs?: number | null;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-caption text-subtle">
          <Icon name="file" size={14} />
          <span className="font-mono tabular">{clock(durationSec)}</span>
        </p>
        <h1 className="mt-1 truncate text-title-1 font-semibold text-text">{fileName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted">
          {speakers.map((s) => (
            <SpeakerName key={s.id} id={s.id} speakers={speakers} size="sm" />
          ))}
          {result && clientMs != null && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="time" size={14} />
              Processed live in {seconds(clientMs)}
            </span>
          )}
          {result && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="cost" size={14} />
              {usd(result.metrics.cost.totalUsd)} · {usd(result.metrics.cost.perAudioMinuteUsd)}/min
            </span>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
