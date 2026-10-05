import { cn } from '@/lib/cn';

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn('animate-pulse bg-surface-muted', className)} />;
