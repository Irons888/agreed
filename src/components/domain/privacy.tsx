import { useState } from 'react';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/dialog';
import { Icon } from '../ui/icon';

/** Where the recording lives, for how long, and the way to remove it now. */
export function PrivacyNote({ retentionDays = 30, onDelete }: { retentionDays?: number; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y-2 border-border-strong py-3">
      <p className="flex items-start gap-2 text-caption text-muted">
        <Icon name="info" size={14} className="mt-px shrink-0" />
        Kept for {retentionDays} days so the quotes stay playable. Anyone with this link can open it.
      </p>
      <Button size="sm" variant="destructive" icon="delete" onClick={() => setOpen(true)}>
        Delete now
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete the recording and the result?"
        confirmLabel="Delete"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await onDelete();
          } finally {
            setBusy(false);
            setOpen(false);
          }
        }}
      >
        Both are removed from storage right away and this link stops working. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
