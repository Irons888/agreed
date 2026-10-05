import { tokens } from '../lib/text';

// Deterministic date handling. Relative wording becomes a calendar date only when the
// recording date is known (stated in the recording or confirmed by the user).

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const UNITS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const ORDINALS = [
  'zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth',
];
const WEEKDAY = WEEKDAYS.join('|');
const TIME_WORDS = new RegExp(
  `\\b(today|tonight|tomorrow|${WEEKDAY}|week|weeks|weekend|month|months|day|days|morning|afternoon|evening|eod|${MONTHS.join('|')})\\b`,
);

type Span = { value: number; length: number };

/** A day of the month spoken as "5", "5th", "fifth", "twenty first" or "twenty one". */
function dayAt(t: string[], i: number): Span | null {
  const word = t[i];
  if (!word) return null;
  const digits = word.match(/^(\d{1,2})(st|nd|rd|th)?$/);
  if (digits) {
    const value = Number(digits[1]);
    return value >= 1 && value <= 31 ? { value, length: 1 } : null;
  }
  if (word === 'twentieth') return { value: 20, length: 1 };
  if (word === 'thirtieth') return { value: 30, length: 1 };
  if (word === 'twenty' || word === 'thirty') {
    const base = word === 'twenty' ? 20 : 30;
    const next = t[i + 1] ?? '';
    const unit = Math.max(ORDINALS.indexOf(next), UNITS.indexOf(next));
    if (unit >= 1 && unit <= 9 && base + unit <= 31) return { value: base + unit, length: 2 };
    return { value: base, length: 1 };
  }
  const ordinal = ORDINALS.indexOf(word);
  if (ordinal >= 1) return { value: ordinal, length: 1 };
  const unit = UNITS.indexOf(word);
  return unit >= 1 ? { value: unit, length: 1 } : null;
}

/** A year spoken as "2026", "twenty twenty six" or "two thousand (and) twenty six". */
function yearAt(t: string[], i: number): Span | null {
  if (/^\d{4}$/.test(t[i] ?? '')) return { value: Number(t[i]), length: 1 };
  let j = i;
  let base = 0;
  if (t[j] === 'twenty' && t[j + 1] === 'twenty') {
    base = 2020;
    j += 2;
  } else if (t[j] === 'two' && t[j + 1] === 'thousand') {
    j += 2;
    if (t[j] === 'and') j++;
    if (t[j] !== 'twenty') return null;
    base = 2020;
    j += 1;
  } else {
    return null;
  }
  const unit = UNITS.indexOf(t[j] ?? '');
  return unit >= 1 && unit <= 9 ? { value: base + unit, length: j + 1 - i } : { value: base, length: j - i };
}

/** Finds "October fifth (twenty twenty six)" or "the fifth of October" in spoken text. */
export function findSpokenDate(text: string): { month: number; day: number; year: number | null } | null {
  const t = tokens(text);
  for (let i = 0; i < t.length; i++) {
    const month = MONTHS.indexOf(t[i]);
    if (month < 0) continue;
    let day = dayAt(t, i + 1);
    let next = i + 1 + (day?.length ?? 0);
    if (!day) {
      // "the fifth of October", "twenty first of October", "5 October"
      const end = t[i - 1] === 'of' ? i - 2 : i - 1;
      const twoWords = end >= 1 ? dayAt(t, end - 1) : null;
      day = twoWords?.length === 2 ? twoWords : end >= 0 ? dayAt(t, end) : null;
      next = i + 1;
    }
    if (!day) continue;
    return { month: month + 1, day: day.value, year: yearAt(t, next)?.value ?? null };
  }
  return null;
}

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => utc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate() + n);
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return utc(y, m, d);
};
const isValidIso = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(fromIso(s)) === s;

/**
 * Accepts the model's recording date only if the quote itself says that month and day,
 * the spoken year (if any) matches, and a spoken weekday agrees with the calendar.
 */
export function checkAnchor(date: string | null, quote: string | null): string | null {
  if (!isValidIso(date) || !quote) return null;
  const spoken = findSpokenDate(quote);
  const d = fromIso(date);
  if (!spoken || spoken.month !== d.getUTCMonth() + 1 || spoken.day !== d.getUTCDate()) return null;
  if (spoken.year !== null && spoken.year !== d.getUTCFullYear()) return null;
  const weekday = tokens(quote).find((w) => WEEKDAYS.includes(w));
  if (weekday && WEEKDAYS.indexOf(weekday) !== d.getUTCDay()) return null;
  return date;
}

export type Resolved = { kind: 'none' | 'date' | 'relative' | 'vague'; date: string | null; ambiguous: boolean };

const numberWord = (w: string) => (/^\d+$/.test(w) ? Number(w) : UNITS.indexOf(w));

export function resolveDeadline(raw: string | null, anchor: string | null): Resolved {
  if (!raw) return { kind: 'none', date: null, ambiguous: false };
  const text = tokens(raw).join(' ');
  const spokenDate = findSpokenDate(raw);
  const dayOfMonth = text.match(/\bthe (\w+(?: \w+)?)\b/);
  const looksTemporal = TIME_WORDS.test(text) || !!spokenDate || (!!dayOfMonth && !!dayAt(dayOfMonth[1].split(' '), 0));
  const unresolved: Resolved = { kind: looksTemporal ? 'relative' : 'vague', date: null, ambiguous: false };
  if (!anchor || !isValidIso(anchor) || !looksTemporal) return unresolved;

  const a = fromIso(anchor);
  const found = (d: Date, ambiguous = false): Resolved => ({ kind: 'date', date: iso(d), ambiguous });
  const mondayOfThisWeek = addDays(a, -((a.getUTCDay() + 6) % 7));
  const weekdayNextWeek = (wd: number) => addDays(mondayOfThisWeek, 7 + ((wd + 6) % 7));

  if (/\b(today|tonight|this evening|this afternoon|end of day|eod)\b/.test(text)) return found(a);
  if (/\bday after tomorrow\b/.test(text)) return found(addDays(a, 2));
  if (/\btomorrow\b/.test(text)) return found(addDays(a, 1));

  const inN = text.match(/\bin (\w+) (day|days|week|weeks)\b/);
  if (inN && numberWord(inN[1]) > 0) return found(addDays(a, numberWord(inN[1]) * (inN[2].startsWith('week') ? 7 : 1)));

  const nextWeekDay =
    text.match(new RegExp(`\\b(${WEEKDAY}) next week\\b`)) ?? text.match(new RegExp(`\\bnext week (?:on )?(${WEEKDAY})\\b`));
  if (nextWeekDay) return found(weekdayNextWeek(WEEKDAYS.indexOf(nextWeekDay[1])));

  // "next Friday" means this coming Friday to some people and the one after to others.
  const nextDay = text.match(new RegExp(`\\bnext (${WEEKDAY})\\b`));
  if (nextDay) return found(weekdayNextWeek(WEEKDAYS.indexOf(nextDay[1])), true);

  const day = text.match(new RegExp(`\\b(${WEEKDAY})\\b`));
  if (day) {
    const wd = WEEKDAYS.indexOf(day[1]);
    const ahead = (wd - a.getUTCDay() + 7) % 7;
    return found(addDays(a, ahead || 7), ahead === 0);
  }

  if (/\bend of (the |this )?week\b/.test(text)) {
    const ahead = (5 - a.getUTCDay() + 7) % 7;
    return found(addDays(a, ahead));
  }
  if (/\bend of (the |this )?month\b/.test(text)) return found(utc(a.getUTCFullYear(), a.getUTCMonth() + 2, 0));

  if (spokenDate) return found(utc(spokenDate.year ?? a.getUTCFullYear(), spokenDate.month, spokenDate.day));

  if (dayOfMonth) {
    const d = dayAt(dayOfMonth[1].split(' '), 0);
    if (d) {
      let candidate = utc(a.getUTCFullYear(), a.getUTCMonth() + 1, d.value);
      if (candidate < a) candidate = utc(a.getUTCFullYear(), a.getUTCMonth() + 2, d.value);
      return found(candidate);
    }
  }
  return unresolved;
}
