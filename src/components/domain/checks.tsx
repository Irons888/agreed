import type { Check } from '../../../worker/types';
import { Icon } from '../ui/icon';

const LABEL: Record<Check['name'], string> = {
  quotes: 'Quotes found in the transcript',
  status: 'Final status supported by the quotes',
  owner: 'Owner stated in the recording',
  deadline: 'Deadline wording found in the quotes',
};

/** What the code checked after the model answered. A note means something was corrected. */
export function VerificationList({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((check) => (
        <li key={check.name} className="flex gap-2.5 text-caption">
          <span className={check.ok ? 'inline-flex size-5 shrink-0 items-center justify-center bg-agreed-bg text-agreed' : 'inline-flex size-5 shrink-0 items-center justify-center bg-review-bg text-review'}>
            <Icon name={check.ok ? 'check' : 'review'} size={14} />
          </span>
          <span className="text-muted">
            {LABEL[check.name]}
            {check.note && <span className="mt-0.5 block text-text">{check.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
