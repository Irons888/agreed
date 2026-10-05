import { useEffect, useState } from 'react';
import { ICONS, Icon, type IconName } from '@/components/ui/icon';

/** Reads a token's live value, so the docs always show what the CSS really says (light or dark). */
function useToken(name: string) {
  const [value, setValue] = useState('');
  useEffect(() => {
    const read = () => setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [name]);
  return value;
}

export function Swatch({ token, use }: { token: string; use: string }) {
  const value = useToken(token);
  return (
    <div className="flex items-center gap-3 border-2 border-border-strong bg-surface p-2.5">
      <span className="size-10 shrink-0 border-2 border-border-strong" style={{ background: `var(${token})` }} />
      <div className="min-w-0">
        <div className="font-mono text-caption text-text">{token}</div>
        <div className="font-mono text-caption text-subtle">{value}</div>
        <div className="text-caption text-muted">{use}</div>
      </div>
    </div>
  );
}

export function SwatchGrid({ tokens }: { tokens: [string, string][] }) {
  return (
    <div className="sb-unstyled font-sans text-text grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map(([token, use]) => (
        <Swatch key={token} token={token} use={use} />
      ))}
    </div>
  );
}

const TYPE_SCALE: [string, string, string, string][] = [
  ['text-display', '84 / 0.92 · Onest 850, uppercase', 'The home headline only', 'headline'],
  ['text-display-sm', '44 / 0.95 · Onest 850, uppercase', 'The home headline on phones', 'headline'],
  ['text-title-1', '36 / 1.1 · Onest 750', 'Page titles, big numbers', 'heading'],
  ['text-title-2', '24 / 1.2 · Onest 750', 'Sections, dialogs', 'heading'],
  ['text-title-3', '20 / 26 · Onest 750', 'Card titles', 'heading'],
  ['text-body-lg', '18 / 28 · Geist 400', 'Intro text, the result summary', ''],
  ['text-quote', '17 / 26 · Geist 400', 'Quotes', ''],
  ['text-body', '15 / 24 · Geist 400', 'Default text', ''],
  ['text-label', '14 / 20 · Geist 600', 'Buttons, names, small headings', 'font-semibold'],
  ['text-caption', '13 / 18 · Geist 400', 'Labels like “Owner”, captions, metadata', ''],
  ['text-micro', '10 / 12', 'Initials in the smallest avatar only', ''],
];

export function TypeScale() {
  return (
    <div className="sb-unstyled font-sans text-text divide-y-2 divide-border border-2 border-border-strong bg-surface">
      {TYPE_SCALE.map(([cls, spec, use, style]) => (
        <div key={cls} className="grid gap-1 p-4 sm:grid-spec">
          <div>
            <div className="font-mono text-caption text-text">{cls}</div>
            <div className="font-mono text-caption text-subtle">{spec}</div>
            <div className="text-caption text-muted">{use}</div>
          </div>
          <div className={`${cls} ${style} min-w-0 break-words text-text`}>Send the API docs by Wednesday</div>
        </div>
      ))}
      <div className="grid gap-1 p-4 sm:grid-spec">
        <div>
          <div className="font-mono text-caption text-text">numeral</div>
          <div className="text-caption text-muted">Big numbers in tiles and counters</div>
        </div>
        <div className="numeral text-title-1 text-text">30/30 · 23.2 s · $0.0071</div>
      </div>
      <div className="grid gap-1 p-4 sm:grid-spec">
        <div>
          <div className="font-mono text-caption text-text">font-mono tabular</div>
          <div className="text-caption text-muted">Times, money, counts in text</div>
        </div>
        <div className="font-mono text-body text-text tabular">0:41 · 2:03 · $0.0071/min · 16.3 s</div>
      </div>
    </div>
  );
}

const MEANING: Record<IconName, string> = {
  agreed: 'Status: agreed',
  question: 'Status: open question',
  review: 'Status: needs review; warnings',
  notAccepted: 'Status: not accepted',
  cancelled: 'Status: cancelled',
  changed: 'Deadline or owner changed',
  owner: 'Owner',
  noOwner: 'No owner named',
  deadline: 'Deadline',
  noDate: 'Date context missing',
  play: 'Play a quote',
  pause: 'Pause',
  back: 'Back 5 seconds; retry',
  forward: 'Forward 5 seconds',
  quote: 'Quote',
  verified: 'Quote verified',
  upload: 'Upload',
  file: 'Recording file',
  sample: 'Test recording',
  waveform: 'Recording, speakers',
  time: 'Processing time',
  cost: 'Cost',
  model: 'Model',
  speed: 'Playback speed',
  checks: 'Verification checks',
  docs: 'Documentation',
  copy: 'Copy',
  download: 'Download',
  delete: 'Delete',
  next: 'Next; changed to',
  previous: 'Back',
  check: 'Done',
  close: 'Dismiss; decline',
  info: 'Note',
  spinner: 'Working',
  expand: 'Collapse',
  open: 'Expand; pending step',
  external: 'External link',
};

export function IconGrid() {
  return (
    <div className="sb-unstyled font-sans text-text grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(ICONS) as IconName[]).map((name) => (
        <div key={name} className="flex items-center gap-3 border-2 border-border-strong bg-surface p-3">
          <span className="inline-flex size-9 items-center justify-center bg-ink text-ink-accent">
            <Icon name={name} size={20} />
          </span>
          <div>
            <div className="font-mono text-caption text-text">{name}</div>
            <div className="text-caption text-muted">{MEANING[name]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const SPACE = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];

export function SpacingScale() {
  return (
    <div className="sb-unstyled font-sans text-text space-y-2">
      {SPACE.map((px) => (
        <div key={px} className="flex items-center gap-3">
          <span className="w-12 font-mono text-caption text-subtle tabular">{px}px</span>
          <span className="h-3 bg-accent" style={{ width: px * 3 }} />
        </div>
      ))}
    </div>
  );
}

/** Lines and surfaces replace radii and shadows: every edge is square, every separation a 2 px line. */
export function LinesAndSurfaces() {
  const lines: [string, string, string][] = [
    ['border-2 border-border-strong', 'Cards, inputs, tables', ''],
    ['border-2 border-dashed border-border-strong', 'Not accepted; the drop zone', ''],
    ['border-2 border-border-strong ring-4 ring-accent', 'Item highlighted from the transcript', ''],
    ['border-l-4 border-speaker-1', 'Quote rule in the speaker colour', 'pl-3'],
  ];
  const surfaces: [string, string][] = [
    ['bg-bg', 'Page: cream'],
    ['bg-surface', 'Cards: paper'],
    ['surface-dark', 'Header, transcript, dark bands: forest'],
    ['bg-accent', 'Primary action, agreed, lead tiles: lime'],
  ];
  return (
    <div className="sb-unstyled font-sans text-text grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        {lines.map(([cls, use, extra]) => (
          <div key={cls} className="flex items-center gap-3">
            <span className={`h-10 w-16 shrink-0 bg-surface ${cls} ${extra}`} />
            <span className="text-caption text-muted">{use}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {surfaces.map(([cls, use]) => (
          <div key={cls} className="flex items-center gap-3">
            <span className={`h-10 w-16 shrink-0 border-2 border-ink ${cls}`} />
            <span className="font-mono text-caption text-text">{cls}</span>
            <span className="text-caption text-muted">{use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
