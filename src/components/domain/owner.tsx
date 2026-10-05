import type { Owner } from '../../../worker/types';
import { Icon } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';
import { SpeakerAvatar } from './speaker';

const HOW: Record<string, string> = {
  commitment: 'Committed in their own words.',
  accepted_request: 'Was asked and accepted.',
  tentative: 'Only offered tentatively, so it needs confirmation.',
};

/** Who owns the task, as a plain fact. "No owner named" is an answer, shown in the warning colour. */
export function OwnerChip({ owner }: { owner: Owner }) {
  if (owner.kind === 'none') {
    return (
      <Tooltip content="Nobody in the recording took this task. The owner is not guessed.">
        <span className="inline-flex items-center gap-1.5 text-label font-semibold text-missing">
          <Icon name="noOwner" size={16} />
          No owner named
        </span>
      </Tooltip>
    );
  }
  if (owner.kind === 'named') {
    return (
      <Tooltip content="Named in the conversation, but not one of the two speakers.">
        <span className="inline-flex items-center gap-1.5 text-label font-semibold text-text">
          <Icon name="owner" size={16} />
          {owner.name}
          <span className="font-normal text-subtle">· not on the call</span>
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={HOW[owner.how]}>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-label font-semibold text-text">
        <SpeakerAvatar id={owner.speaker} name={owner.name} size="sm" />
        <span className="truncate">{owner.name}</span>
        {owner.how === 'tentative' && <span className="font-normal text-missing">· tentative</span>}
      </span>
    </Tooltip>
  );
}
