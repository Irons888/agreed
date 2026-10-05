import type { Item, Turn } from '../../../worker/types';
import { usePlayer } from '@/lib/audio/player';
import { clock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { decidingEvidence } from './commitment-card';
import { speakerTone } from './speaker';
import { STATUS_META } from './status';

const HEIGHT = 56;

/** The whole recording: who speaks when, where each item was decided, and the playhead. */
export function WaveformTimeline({
  peaks,
  duration,
  turns,
  items = [],
  highlighted = null,
  onHighlight,
}: {
  peaks: number[];
  duration: number;
  turns: Turn[];
  items?: Item[];
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const player = usePlayer();
  const width = peaks.length;
  const speakerAt = (t: number) => turns.find((turn) => t >= turn.start - 0.1 && t <= turn.end + 0.1)?.speaker;
  const x = (t: number) => (t / Math.max(duration, 0.001)) * width;
  const playing = player.segment;

  const seekTo = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    player.seek(((event.clientX - box.left) / box.width) * duration);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-14 w-full cursor-pointer"
        onClick={seekTo}
        role="img"
        aria-label={`Recording, ${clock(duration)} long. Click to move the playhead.`}
      >
        {playing && <rect x={x(playing.start)} width={Math.max(1, x(playing.end) - x(playing.start))} y={0} height={HEIGHT} className="fill-surface-muted" />}
        {peaks.map((peak, i) => {
          const t = (i / width) * duration;
          const speaker = speakerAt(t);
          const h = Math.max(2, peak * (HEIGHT - 8));
          return (
            <rect
              key={i}
              x={i + 0.2}
              width={0.6}
              y={(HEIGHT - h) / 2}
              height={h}
              className={cn(speaker ? speakerTone(speaker).fill : 'fill-border', player.time > t ? 'opacity-100' : 'opacity-70')}
            />
          );
        })}
        <rect x={x(player.time)} width={Math.max(1.5, width / 300)} y={0} height={HEIGHT} className="fill-ink" />
      </svg>
      {/* Markers: where each item was decided. */}
      <div className="relative mt-1 h-4">
        {items.map((item) => {
          const e = decidingEvidence(item);
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.title} at ${clock(e.start)}`}
              title={`${item.title} · ${clock(e.start)}`}
              onMouseEnter={() => onHighlight?.(item.id)}
              onMouseLeave={() => onHighlight?.(null)}
              onClick={() => {
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                player.playSegment(`${item.id}:deciding`, e.start, e.end);
              }}
              className={cn(
                'absolute top-0 size-3 -translate-x-1/2 transition-transform',
                STATUS_META[item.status].dot,
                highlighted === item.id && 'scale-150',
              )}
              style={{ left: `${(e.start / Math.max(duration, 0.001)) * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
