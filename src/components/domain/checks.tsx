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
    <ul className="space-y-1.5">
      {checks.map((check) => (
        <li key={check.name} className="flex gap-2 text-caption">
          <Icon name={check.ok ? 'check' : 'review'} size={14} className={check.ok ? 'mt-px text-agreed' : 'mt-px text-review'} />
          <span className="text-muted">
            {LABEL[check.name]}
            {check.note && <span className="block text-text">{check.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
