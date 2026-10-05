import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';
import { Tooltip } from './tooltip';

export const buttonStyles = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-display font-bold transition-colors disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        /** The one main action: lime. */
        primary: 'bg-accent text-on-accent hover:bg-accent-strong',
        /** Outlined in the current ink; inverts on hover. */
        secondary: 'border-2 border-border-strong text-text hover:bg-ink hover:text-ink-contrast',
        ink: 'bg-ink text-ink-contrast hover:bg-ink/85',
        ghost: 'text-muted underline-offset-4 hover:text-text hover:underline',
        destructive: 'border-2 border-danger text-danger hover:bg-danger hover:text-surface',
      },
      size: {
        sm: 'h-9 px-3 text-label',
        md: 'h-11 px-5 text-label',
        lg: 'h-14 px-7 text-body-lg',
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

const iconButtonSize = { sm: 'size-9', md: 'size-11', lg: 'size-14' } as const;

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
      <button
        aria-label={label}
        className={cn(
          'inline-flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40',
          variant === 'primary' && 'bg-accent text-on-accent hover:bg-accent-strong',
          variant === 'secondary' && 'border-2 border-border-strong text-text hover:bg-ink hover:text-ink-contrast',
          variant === 'ghost' && 'text-muted hover:bg-surface-muted hover:text-text',
          iconButtonSize[size],
          className,
        )}
        {...props}
      >
        <Icon name={icon} size={size === 'lg' ? 20 : 16} />
      </button>
    </Tooltip>
  );
}

export function ButtonRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
