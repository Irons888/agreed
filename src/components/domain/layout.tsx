import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';

/** Logo: four bars, the last one lime, next to the wordmark. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="inline-flex size-8 items-center justify-center gap-0.5 bg-accent">
        {[8, 14, 10, 18].map((h, i) => (
          <span key={i} className={cn('w-1', i === 3 ? 'bg-on-accent' : 'bg-on-accent/70')} style={{ height: h }} />
        ))}
      </span>
      <span className="headline text-title-3 tracking-tight">Agreed</span>
    </span>
  );
}

export function TopNav({ onNavigate, current }: { onNavigate: (path: string) => void; current: string }) {
  const link = (path: string, label: string) => (
    <a
      href={path}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(path);
      }}
      aria-current={current === path ? 'page' : undefined}
      className={cn('px-2 py-1.5 text-label font-semibold', current === path ? 'text-text' : 'text-muted hover:text-text')}
    >
      {label}
    </a>
  );
  return (
    <header className="surface-dark border-b-2 border-border-strong">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          aria-label="Agreed, home"
        >
          <Logo />
        </a>
        <nav className="flex items-center gap-1 sm:gap-3">
          <span className="hidden sm:contents">
            {link('/', 'Analyze')}
            {link('/quality', 'Quality')}
          </span>
          <a href="/storybook/" className="hidden px-2 py-1.5 text-label font-semibold text-muted hover:text-text sm:inline">
            Design system
          </a>
          <Button size="sm" variant="primary" onClick={() => onNavigate('/')} className="ml-1">
            Analyze a recording
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8', className)}>{children}</main>;
}

export function Footer() {
  return (
    <footer className="surface-dark border-t-2 border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 sm:px-6 lg:px-8">
        <span className="tag-label text-muted">A test-task prototype for Codebridge · English · two speakers · up to 3 minutes</span>
        <span className="tag-label text-muted">Deepgram Nova-3 · gpt-oss-120b · Cloudflare Workers AI</span>
      </div>
    </footer>
  );
}
