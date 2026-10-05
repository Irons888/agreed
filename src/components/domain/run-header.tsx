import type { ReactNode } from 'react';
import type { Speaker } from '../../../worker/types';
import { clock } from '@/lib/format';
import { SpeakerName } from './speaker';

/** The recording this page is about: name, length, who speaks, and the two actions that matter. */
export function RunHeader({ fileName, durationSec, speakers, actions }: { fileName: string; durationSec: number; speakers: Speaker[]; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <p className="text-caption text-muted">Recording · {clock(durationSec)}</p>
        <h1 className="heading mt-1 break-all text-title-1 text-text">{fileName}</h1>
        {speakers.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-label">
            {speakers.map((s) => (
              <SpeakerName key={s.id} id={s.id} speakers={speakers} size="md" />
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
