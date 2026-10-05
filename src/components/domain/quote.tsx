import type { Evidence, EvidenceRole, Speaker } from '../../../worker/types';
import { spoken } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';
import { SpeakerName, speakerTone } from './speaker';
import { TimestampButton } from './timestamp';

export const ROLE_LABEL: Record<EvidenceRole, string> = {
  proposal: 'Proposal',
  request: 'Request',
  commitment: 'Commitment',
  acceptance: 'Acceptance',
  rejection: 'Declined',
  hedge: 'Hedged',
  deadline_change: 'Deadline change',
  cancellation: 'Cancellation',
  question: 'Question',
  no_answer: 'No answer',
};

const MATCH_NOTE: Record<Evidence['match'], string> = {
  exact: 'Found word for word in the transcript.',
  repaired: 'The model paraphrased slightly; this is the exact transcript wording.',
  moved: 'Found in a different turn than the model cited.',
};

export function QuoteBlock({ evidence, speakers, id, className }: { evidence: Evidence; speakers: Speaker[]; id: string; className?: string }) {
  return (
    <figure className={cn('border-l-2 pl-3', speakerTone(evidence.speaker).rule, className)}>
      <blockquote className="text-quote text-text">{spoken(evidence.quote)}</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-caption text-subtle">
        <SpeakerName id={evidence.speaker} speakers={speakers} size="xs" />
        <span>{ROLE_LABEL[evidence.role]}</span>
        <TimestampButton id={id} start={evidence.start} end={evidence.end} />
        <Tooltip content={MATCH_NOTE[evidence.match]}>
          <span className="inline-flex items-center gap-1 text-agreed">
            <Icon name="verified" size={14} />
            Verified
          </span>
        </Tooltip>
      </figcaption>
    </figure>
  );
}
