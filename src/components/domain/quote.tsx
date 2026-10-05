import type { Evidence, EvidenceRole, Speaker } from '../../../worker/types';
import { spoken } from '@/lib/format';
import { cn } from '@/lib/cn';
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
  exact: 'found word for word',
  repaired: 'model paraphrased slightly, transcript wording shown',
  moved: 'found in a different turn than the model cited',
};

/**
 * The words an item rests on, with ▶ to hear them. The card shows one quote plainly;
 * "detailed" adds what the quote does (request, acceptance…) and how it was matched, for the Details view.
 */
export function QuoteBlock({
  evidence,
  speakers,
  id,
  detailed = false,
  className,
}: {
  evidence: Evidence;
  speakers: Speaker[];
  id: string;
  detailed?: boolean;
  className?: string;
}) {
  return (
    <figure className={cn('border-l-4 pl-4', speakerTone(evidence.speaker).rule, className)}>
      <blockquote className="text-quote text-text">{spoken(evidence.quote)}</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-muted">
        <TimestampButton id={id} start={evidence.start} end={evidence.end} className="h-7" />
        <SpeakerName id={evidence.speaker} speakers={speakers} size="xs" />
        {detailed && (
          <span>
            {ROLE_LABEL[evidence.role]} · {MATCH_NOTE[evidence.match]}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
