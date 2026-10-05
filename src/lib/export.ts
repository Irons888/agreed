import type { Item, Result } from '../../worker/types';
import { calendarDate, clock, spoken } from './format';
import { SECTIONS } from '@/components/domain/sections';

const owner = (item: Item) => (item.owner.kind === 'none' ? 'no owner named' : item.owner.name);
const deadline = (item: Item) => {
  const d = item.deadline;
  if (d.kind === 'none') return 'no deadline agreed';
  if (d.kind === 'date' && d.date) return `${calendarDate(d.date)} (${spoken(d.raw ?? '')})`;
  if (d.kind === 'relative') return `${spoken(d.raw ?? '')}, date context missing`;
  return spoken(d.raw ?? '');
};

export function toMarkdown(result: Result, fileName: string): string {
  const lines = [`# Commitments: ${fileName}`, ''];
  for (const section of SECTIONS) {
    const items = result.items.filter((i) => section.statuses.includes(i.status));
    if (!items.length) continue;
    lines.push(`## ${section.title}`, '');
    for (const item of items) {
      const quote = item.evidence[item.evidence.length - 1];
      const meta = item.status === 'agreed' || item.status === 'needs_review' ? ` — ${owner(item)}, ${deadline(item)}` : '';
      lines.push(`- **${item.title}**${meta}`);
      lines.push(`  > ${spoken(quote.quote)} (${clock(quote.start)})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function downloadJson(result: Result, fileName: string) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\.[^.]+$/, '')}.commitments.json`;
  a.click();
  URL.revokeObjectURL(url);
}
