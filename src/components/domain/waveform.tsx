import type { Turn } from '../../../worker/types';
import { usePlayer } from '@/lib/audio/player';
import { clock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { speakerTone } from './speaker';

const HEIGHT = 56;

/** The whole recording: who speaks when, the quote that is playing, and the playhead. Click to move it. */
export function WaveformTimeline({ peaks, duration, turns }: { peaks: number[]; duration: number; turns: Turn[] }) {
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
    </div>
  );
}
