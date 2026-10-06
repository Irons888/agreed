import { Dialog as D } from 'radix-ui';
import type { ReactNode } from 'react';
import { Button } from './button';

/** Confirmation for irreversible actions. The destructive button names the action, never just "OK". */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <D.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 border-2 border-border-strong bg-surface p-6">
          <D.Title className="heading text-title-2 text-text">{title}</D.Title>
          <D.Description asChild>
            <div className="mt-2 text-body text-muted">{children}</div>
          </D.Description>
          <div className="mt-5 flex justify-end gap-2">
            <D.Close asChild>
              <Button variant="ghost">Cancel</Button>
            </D.Close>
            <Button variant="destructive" icon="delete" loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** A short form in a dialog: fields, Cancel, and one main action. Enter submits. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  extra,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  /** A secondary action on the left of the footer, such as a reset. */
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <D.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[90vh] max-w-lg -translate-y-1/2 overflow-y-auto border-2 border-border-strong bg-surface p-6">
          <D.Title className="heading text-title-2 text-text">{title}</D.Title>
          <D.Description className={description ? 'mt-2 text-body text-muted' : 'sr-only'}>{description ?? title}</D.Description>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {children}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {extra && <div className="mr-auto">{extra}</div>}
              <D.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </D.Close>
              <Button type="submit" variant="primary">
                {submitLabel}
              </Button>
            </div>
          </form>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

