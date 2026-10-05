import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-title-3 font-semibold tracking-tight text-text">
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand text-ink-contrast">
        <Icon name="check" size={14} />
      </span>
      agreed
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
      className={cn('rounded-sm px-2.5 py-1.5 text-label font-medium', current === path ? 'text-text' : 'text-muted hover:text-text')}
    >
      {label}
    </a>
  );
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
        <nav className="flex items-center gap-1">
          {link('/', 'Analyze')}
          {link('/quality', 'Quality')}
          <a href="/storybook/" className="rounded-sm px-2.5 py-1.5 text-label font-medium text-muted hover:text-text">
            Design system
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8', className)}>{children}</main>;
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-caption text-subtle sm:px-6 lg:px-8">
        <span>A test-task prototype for Codebridge. English, two speakers, up to 3 minutes.</span>
        <span>Speech: Deepgram Nova-3 · Reasoning: gpt-oss-120b · on Cloudflare Workers AI</span>
      </div>
    </footer>
  );
}
