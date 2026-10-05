import { usePlayer } from '@/lib/audio/player';
import { clock } from '@/lib/format';
import { Button, IconButton } from '../ui/button';

export function PlayerBar({ duration }: { duration: number }) {
  const player = usePlayer();
  return (
    <div className="flex items-center gap-1">
      <IconButton icon="back" label="Back 5 seconds" size="sm" onClick={() => player.skip(-5)} disabled={!player.ready} />
      <IconButton
        icon={player.playing ? 'pause' : 'play'}
        label={player.playing ? 'Pause' : 'Play recording'}
        variant="primary"
        size="sm"
        onClick={player.toggle}
        disabled={!player.ready}
      />
      <IconButton icon="forward" label="Forward 5 seconds" size="sm" onClick={() => player.skip(5)} disabled={!player.ready} />
      <span className="ml-2 font-mono text-caption tabular text-muted">
        {clock(player.time)} / {clock(duration)}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto font-mono tabular"
        onClick={() => player.setRate(player.rate === 1 ? 1.5 : 1)}
        aria-label={`Playback speed ${player.rate}×. Click to change.`}
      >
        {player.rate}×
      </Button>
    </div>
  );
}
