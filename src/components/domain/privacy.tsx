import { useState } from 'react';
import { ConfirmDialog } from '../ui/dialog';
import { Icon } from '../ui/icon';

/** Where the recording lives, for how long, and the way to remove it now. One quiet line. */
export function PrivacyNote({ retentionDays = 30, onDelete }: { retentionDays?: number; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
        <Icon name="info" size={14} />
        Kept for {retentionDays} days so the quotes stay playable. Anyone with this link can open it.
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-danger underline underline-offset-2 hover:no-underline">
          Delete now
        </button>
      </p>
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
    </>
  );
}
