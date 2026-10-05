import type { ReactNode } from 'react';
import type { Result, Speaker } from '../../../worker/types';
import { clock, seconds, usd } from '@/lib/format';
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
  const facts = [`Recording · ${clock(durationSec)}`];
  if (result && clientMs != null) facts.push(`Processed live in ${seconds(clientMs)}`);
  if (result) facts.push(`${usd(result.metrics.cost.totalUsd)} · ${usd(result.metrics.cost.perAudioMinuteUsd)}/min`);
  return (
    <header>
      <p className="tag-label flex flex-wrap gap-x-4 gap-y-1 text-subtle">
        {facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </p>
      <h1 className="headline mt-3 break-all text-display-sm sm:text-title-1">{fileName}</h1>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-label">
          {speakers.map((s) => (
            <SpeakerName key={s.id} id={s.id} speakers={speakers} size="md" />
          ))}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
