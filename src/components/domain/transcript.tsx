import { useEffect, useMemo, useRef } from 'react';
import type { Item, Speaker, Status, Turn } from '../../../worker/types';
import { usePlayer } from '@/lib/audio/player';
import { cn } from '@/lib/cn';
import { STATUS_META } from './status';
import { SpeakerAvatar, speakerLabel } from './speaker';
import { TimestampButton } from './timestamp';

type Mark = { itemId: string; status: Status };

/** For every word, the item whose quote covers it, so quotes are highlighted inside the transcript. */
function markWords(turns: Turn[], items: Item[]): Map<string, Mark> {
  const marks = new Map<string, Mark>();
  for (const item of items) {
    for (const e of item.evidence) {
      const turn = turns.find((t) => t.id === e.turn);
      turn?.words.forEach((w, i) => {
        if (w.start >= e.start - 0.01 && w.end <= e.end + 0.01) marks.set(`${turn.id}:${i}`, { itemId: item.id, status: item.status });
      });
    }
  }
  return marks;
}

export function TranscriptView({
  turns,
  speakers,
  items = [],
  highlighted = null,
  onHighlight,
}: {
  turns: Turn[];
  speakers: Speaker[];
  items?: Item[];
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const player = usePlayer();
  const marks = useMemo(() => markWords(turns, items), [turns, items]);
  const activeTurn = player.playing ? turns.find((t) => player.time >= t.start - 0.05 && player.time <= t.end + 0.2)?.id : undefined;
  const list = useRef<HTMLOListElement>(null);

  // Follow playback of a quote, without moving the page.
  useEffect(() => {
    if (!activeTurn || !player.segment) return;
    const container = list.current?.parentElement;
    const row = list.current?.querySelector<HTMLElement>(`[data-turn="${activeTurn}"]`);
    if (!container || !row) return;
    const top = row.offsetTop - container.offsetTop;
    if (top < container.scrollTop || top > container.scrollTop + container.clientHeight - row.clientHeight) {
      container.scrollTo({ top: top - 16, behavior: 'smooth' });
    }
  }, [activeTurn, player.segment]);

  return (
    <ol ref={list} className="space-y-4">
      {turns.map((turn) => {
        const speaker = speakers.find((s) => s.id === turn.speaker);
        return (
          <li key={turn.id} data-turn={turn.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <SpeakerAvatar id={turn.speaker} name={speaker?.name} />
            <div>
              <div className="flex items-center gap-2 text-caption">
                <span className="font-medium text-text">{speakerLabel(turn.speaker, speakers)}</span>
                <TimestampButton id={`turn:${turn.id}`} start={turn.start} end={turn.end} label="this turn" className="h-6" />
              </div>
              <p className="mt-1 text-body text-text">
                {turn.words.map((word, i) => {
                  const mark = marks.get(`${turn.id}:${i}`);
                  const current = player.playing && player.time >= word.start && player.time < word.end + 0.05;
                  return (
                    <span key={i}>
                      <span
                        onMouseEnter={mark ? () => onHighlight?.(mark.itemId) : undefined}
                        onMouseLeave={mark ? () => onHighlight?.(null) : undefined}
                        className={cn(
                          'rounded-xs transition-colors',
                          mark && STATUS_META[mark.status].highlight,
                          mark && highlighted === mark.itemId && 'underline decoration-focus decoration-2 underline-offset-4',
                          current && 'bg-ink text-ink-contrast',
                        )}
                      >
                        {word.text}
                      </span>{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
