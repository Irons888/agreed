import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Logo: four bars, the last one lime, next to the wordmark. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="inline-flex size-8 items-center justify-center gap-0.5 bg-accent">
        {[8, 14, 10, 18].map((h, i) => (
          <span key={i} className={cn('w-1', i === 3 ? 'bg-on-accent' : 'bg-on-accent/70')} style={{ height: h }} />
        ))}
      </span>
      <span className="headline hidden text-title-3 tracking-tight sm:inline">Agreed</span>
    </span>
  );
}

/** Three places for a user (New, History, Tasks); the reviewer pages sit on the right. */
export function TopNav({ onNavigate, current }: { onNavigate: (path: string) => void; current: string }) {
  const go = (path: string) => (e: MouseEvent) => {
    e.preventDefault();
    onNavigate(path);
  };
  const tab = (path: string, label: string) => (
    <a
      href={path}
      onClick={go(path)}
      aria-current={current === path ? 'page' : undefined}
      className={cn('px-2.5 py-1.5 text-label font-semibold whitespace-nowrap', current === path ? 'bg-accent text-on-accent' : 'text-muted hover:text-text')}
    >
      {label}
    </a>
  );
  return (
    <header className="surface-dark border-b-2 border-border-strong">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6 lg:px-8">
        <a href="/" onClick={go('/')} aria-label="Agreed, new recording">
          <Logo />
        </a>
        <nav aria-label="Main" className="flex items-center gap-1">
          {tab('/', 'New')}
          {tab('/history', 'History')}
          {tab('/tasks', 'Tasks')}
        </nav>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <a
            href="/quality"
            onClick={go('/quality')}
            aria-current={current === '/quality' ? 'page' : undefined}
            className={cn('px-2 py-1.5 text-caption font-semibold whitespace-nowrap', current === '/quality' ? 'text-text' : 'text-muted hover:text-text')}
          >
            Quality report
          </a>
          <a href="/storybook/" className="px-2 py-1.5 text-caption font-semibold whitespace-nowrap text-muted hover:text-text">
            Design system
          </a>
        </div>
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
        <span className="text-caption text-muted">A test-task prototype for Codebridge · English · two speakers · up to 3 minutes</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
          <a href="/quality" className="font-semibold hover:text-text">
            Quality report
          </a>
          <a href="/storybook/" className="font-semibold hover:text-text">
            Design system
          </a>
          <span>Deepgram Nova-3 · gpt-oss-120b · Workers AI</span>
        </span>
      </div>
    </footer>
  );
}
