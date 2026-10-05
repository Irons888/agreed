import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

/** Base tag: a square monospace label. Domain tags (status, outcome) are built on top of it. */
export function Badge({
  children,
  icon,
  className,
  size = 'md',
}: {
  children: ReactNode;
  icon?: IconName;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'tag-label inline-flex max-w-full items-center gap-1.5 border whitespace-nowrap',
        size === 'sm' ? 'h-5 px-1.5' : 'h-6 px-2',
        'border-border-strong text-text',
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
