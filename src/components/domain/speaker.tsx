import type { Speaker } from '../../../worker/types';
import { cn } from '@/lib/cn';

/** S1 and S2 get the two speaker colours; anything else stays neutral. Colour is never the only cue. */
export function speakerTone(id: string) {
  if (id === 'S1') return { avatar: 'bg-speaker-1-bg text-speaker-1', rule: 'border-speaker-1', fill: 'fill-speaker-1', dot: 'bg-speaker-1' };
  if (id === 'S2') return { avatar: 'bg-speaker-2-bg text-speaker-2', rule: 'border-speaker-2', fill: 'fill-speaker-2', dot: 'bg-speaker-2' };
  return { avatar: 'bg-surface-muted text-muted', rule: 'border-border-strong', fill: 'fill-subtle', dot: 'bg-subtle' };
}

export const speakerLabel = (id: string, speakers: Speaker[]) => speakers.find((s) => s.id === id)?.label ?? `Speaker ${id.slice(1)}`;

const avatarSize = { xs: 'size-4 text-micro', sm: 'size-5 text-caption', md: 'size-7 text-label' } as const;

export function SpeakerAvatar({ id, name, size = 'md' }: { id: string; name?: string | null; size?: keyof typeof avatarSize }) {
  // Unnamed voices show their number, not the S of "Speaker".
  const initial = name && !/^Speaker \d+$/.test(name) ? name.trim()[0]?.toUpperCase() : id.slice(1);
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', avatarSize[size], speakerTone(id).avatar)}
    >
      {initial}
    </span>
  );
}

export function SpeakerName({ id, speakers, size = 'sm' }: { id: string; speakers: Speaker[]; size?: 'xs' | 'sm' | 'md' }) {
  const speaker = speakers.find((s) => s.id === id);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <SpeakerAvatar id={id} name={speaker?.name} size={size} />
      <span className="truncate font-medium text-text">{speaker?.label ?? `Speaker ${id.slice(1)}`}</span>
    </span>
  );
}
