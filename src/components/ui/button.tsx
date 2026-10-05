import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';
import { Tooltip } from './tooltip';

export const buttonStyles = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ink-contrast hover:opacity-90 active:opacity-80',
        secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-muted',
        ghost: 'text-muted hover:bg-surface-muted hover:text-text',
        destructive: 'border border-border-strong bg-surface text-danger hover:bg-danger-bg',
      },
      size: {
        sm: 'h-8 px-3 text-label',
        md: 'h-9 px-3.5 text-label',
        lg: 'h-11 px-5 text-body',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & { icon?: IconName; iconAfter?: IconName; loading?: boolean; asChild?: boolean };

export function Button({ className, variant, size, icon, iconAfter, loading, asChild, children, disabled, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  const iconSize = size === 'lg' ? 20 : 16;
  return (
    <Component className={cn(buttonStyles({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Icon name="spinner" size={iconSize} /> : icon && <Icon name={icon} size={iconSize} />}
      {asChild ? children : <span>{children}</span>}
      {iconAfter && <Icon name={iconAfter} size={iconSize} />}
    </Component>
  );
}

const iconButtonSize = { sm: 'size-8', md: 'size-9', lg: 'size-11' } as const;

/** A button with only an icon must have a label: it becomes the tooltip and the accessible name. */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Tooltip content={label}>
      <button aria-label={label} className={cn(buttonStyles({ variant }), iconButtonSize[size], 'px-0', className)} {...props}>
        <Icon name={icon} size={size === 'lg' ? 20 : 16} />
      </button>
    </Tooltip>
  );
}

export function ButtonRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
