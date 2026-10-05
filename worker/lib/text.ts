/** Lowercase words only: punctuation and hyphens become spaces, apostrophes inside words stay. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const tokens = (text: string): string[] => {
  const n = normalize(text);
  return n ? n.split(' ') : [];
};

export const containsPhrase = (haystack: string, needle: string): boolean => {
  const h = ` ${normalize(haystack)} `;
  const n = normalize(needle);
  return n.length > 0 && h.includes(` ${n} `);
};

export const clock = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds - m * 60).toFixed(1).padStart(4, '0')}`;
};

/** "I'll try", "maybe", "no promises": acceptance that is not a firm commitment. */
export const HEDGE =
  /\b(i'll try|i will try|try to|trying to|maybe|might|no promises|if i have time|if i can|probably|not sure|we'll see|hopefully|possibly|i guess)\b/;

/** First-person commitment: "I'll send", "I will", "I'm going to", "let me". */
export const COMMITMENT = /\b(i'll|i will|i'm going to|i am going to|i can|i shall|let me|i'm on it|will do)\b/;

/** Any first-person reference, used for tentative owners of hedged items. */
export const FIRST_PERSON = /\b(i|i'll|i'm|i've|i'd|me|my)\b/;

/** A request addressed to the listener: "can you", "could you", "please". */
export const ADDRESSED = /\b(can you|could you|would you|will you|you'll|you will|you can|please)\b/;
