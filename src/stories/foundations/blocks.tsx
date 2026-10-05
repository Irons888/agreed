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
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-2.5">
      <span className="size-10 shrink-0 rounded-sm border border-border" style={{ background: `var(${token})` }} />
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
    <div className="not-prose grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map(([token, use]) => (
        <Swatch key={token} token={token} use={use} />
      ))}
    </div>
  );
}

const TYPE_SCALE: [string, string, string][] = [
  ['text-display', '40 / 44 · 600', 'Home headline'],
  ['text-title-1', '24 / 32 · 600', 'Page title'],
  ['text-title-2', '18 / 26 · 600', 'Section'],
  ['text-title-3', '16 / 24 · 600', 'Card title'],
  ['text-body-lg', '16 / 26 · 400', 'Text on the home page'],
  ['text-quote', '15 / 24 · 400', 'Quotes'],
  ['text-body', '14 / 22 · 400', 'Default text'],
  ['text-label', '13 / 18 · 500', 'Buttons, chips'],
  ['text-caption', '12 / 16 · 500', 'Captions, metadata'],
  ['text-micro', '10 / 12', 'Initials in the smallest avatar only'],
];

export function TypeScale() {
  return (
    <div className="not-prose divide-y divide-border rounded-card border border-border bg-surface">
      {TYPE_SCALE.map(([cls, spec, use]) => (
        <div key={cls} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]">
          <div>
            <div className="font-mono text-caption text-text">{cls}</div>
            <div className="font-mono text-caption text-subtle">{spec}</div>
            <div className="text-caption text-muted">{use}</div>
          </div>
          <div className={`${cls} ${cls === 'text-display' || cls.startsWith('text-title') ? 'font-semibold' : ''} text-text`}>Send the API docs by Wednesday</div>
        </div>
      ))}
      <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]">
        <div>
          <div className="font-mono text-caption text-text">font-mono tabular</div>
          <div className="text-caption text-muted">Times, money, counts</div>
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
    <div className="not-prose grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(ICONS) as IconName[]).map((name) => (
        <div key={name} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
          <span className="inline-flex size-9 items-center justify-center rounded-sm bg-surface-muted text-text">
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
    <div className="not-prose space-y-2">
      {SPACE.map((px) => (
        <div key={px} className="flex items-center gap-3">
          <span className="w-12 font-mono text-caption text-subtle tabular">{px}px</span>
          <span className="h-3 rounded-xs bg-speaker-1" style={{ width: px * 3 }} />
        </div>
      ))}
    </div>
  );
}

export function RadiiAndShadows() {
  const radii: [string, string][] = [
    ['rounded-xs', '4 · highlights'],
    ['rounded-sm', '6 · buttons, inputs'],
    ['rounded-card', '10 · cards'],
    ['rounded-panel', '14 · panels'],
    ['rounded-full', 'pills, avatars'],
  ];
  const shadows: [string, string][] = [
    ['shadow-xs', 'cards at rest'],
    ['shadow-md', 'card hover, popovers'],
    ['shadow-lg', 'dialogs'],
  ];
  return (
    <div className="not-prose grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        {radii.map(([cls, use]) => (
          <div key={cls} className="flex items-center gap-3">
            <span className={`size-10 border border-border-strong bg-surface-muted ${cls}`} />
            <span className="font-mono text-caption text-text">{cls}</span>
            <span className="text-caption text-muted">{use}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {shadows.map(([cls, use]) => (
          <div key={cls} className="flex items-center gap-3">
            <span className={`h-10 w-16 rounded-card border border-border bg-surface ${cls}`} />
            <span className="font-mono text-caption text-text">{cls}</span>
            <span className="text-caption text-muted">{use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
