import type { Owner } from '../../../worker/types';
import { Badge } from '../ui/badge';
import { Tooltip } from '../ui/tooltip';
import { SpeakerAvatar } from './speaker';

const HOW: Record<string, string> = {
  commitment: 'Committed in their own words.',
  accepted_request: 'Was asked and accepted.',
  tentative: 'Only offered tentatively, so it needs confirmation.',
};

export function OwnerChip({ owner }: { owner: Owner }) {
  if (owner.kind === 'none') {
    return (
      <Tooltip content="Nobody in the recording took this task. The owner is not guessed.">
        <span className="inline-flex">
          <Badge icon="noOwner" className="border-dashed border-missing-border bg-transparent text-missing">
            No owner named
          </Badge>
        </span>
      </Tooltip>
    );
  }
  if (owner.kind === 'named') {
    return (
      <Tooltip content="Named in the conversation, but not one of the two speakers.">
        <span className="inline-flex">
          <Badge icon="owner" className="text-text">
            {owner.name}
          </Badge>
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={HOW[owner.how]}>
      <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border border-border bg-surface pr-2 pl-0.5 text-label font-medium text-text">
        <SpeakerAvatar id={owner.speaker} name={owner.name} size="sm" />
        <span className="truncate">{owner.name}</span>
        {owner.how === 'tentative' && <span className="font-normal text-subtle">· tentative</span>}
      </span>
    </Tooltip>
  );
}
