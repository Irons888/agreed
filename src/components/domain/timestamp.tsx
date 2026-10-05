import { usePlayer } from '@/lib/audio/player';
import { clock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';

function Equalizer() {
  return (
    <span aria-hidden className="flex h-3 items-end gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-3 w-0.5 origin-bottom animate-bars bg-current" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/** ▶ 0:41 — plays exactly the quoted words; shows an equalizer and progress while it plays. */
export function TimestampButton({ id, start, end, label = 'quote', className }: { id: string; start: number; end: number; label?: string; className?: string }) {
  const player = usePlayer();
  const active = player.playing && player.segment?.id === id;
  const progress = active && player.segment ? (player.time - player.segment.start) / (player.segment.end - player.segment.start) : 0;
  return (
    <button
      type="button"
      onClick={() => player.playSegment(id, start, end)}
      disabled={!player.ready}
      aria-label={`${active ? 'Pause' : 'Play'} ${label} at ${clock(start)}`}
      aria-pressed={active}
      className={cn(
        'relative inline-flex h-8 shrink-0 items-center gap-1.5 overflow-hidden border-2 px-2.5 font-mono text-caption font-medium tabular transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'border-ink bg-ink text-ink-accent' : 'border-border-strong text-text hover:border-ink hover:bg-accent hover:text-on-accent',
        className,
      )}
    >
      {active ? <Equalizer /> : <Icon name="play" size={14} />}
      {clock(start)}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left bg-accent" style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
    </button>
  );
}
