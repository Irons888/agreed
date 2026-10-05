import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

/** Base pill. Domain badges (status, owner, deadline) are built on top of it. */
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
        'inline-flex max-w-full items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'h-5 px-1.5 text-caption' : 'h-6 px-2 text-label',
        'border-border bg-surface text-muted',
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
