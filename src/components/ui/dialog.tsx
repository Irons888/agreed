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
        <D.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <D.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-panel border border-border bg-surface p-5 shadow-lg">
          <D.Title className="text-title-2 font-semibold text-text">{title}</D.Title>
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
