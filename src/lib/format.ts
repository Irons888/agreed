// Formatting rules from the design system (Foundations / Content).

/** Position in a recording: 0:41, 2:03. */
export const clock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Processing time: 6.2 s. */
export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** Money: sub-cent amounts keep four decimals. */
export const usd = (value: number) => (value >= 0.1 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`);

/** Calendar date: Fri, Oct 9. */
export const calendarDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Spoken wording is always shown in curly quotes. */
export const spoken = (text: string) => `“${text.replace(/^["“”]+|["“”]+$/g, '')}”`;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
