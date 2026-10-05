import { usePlayer } from '@/lib/audio/player';
import { clock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';

/** ▶ 0:41 — plays exactly the quoted words; shows progress while it plays. */
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
        'relative inline-flex h-7 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border pr-2.5 pl-2 font-mono text-caption tabular transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-ink bg-ink text-ink-contrast' : 'border-border bg-surface text-text hover:bg-surface-muted',
        className,
      )}
    >
      <Icon name={active ? 'pause' : 'play'} size={14} />
      {clock(start)}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-focus"
        style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
      />
    </button>
  );
}
