import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';

export function UploadDropzone({ onFile, busy = false, error = null }: { onFile: (file: File) => void; busy?: boolean; error?: string | null }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}
      className={cn(
        'border-2 border-dashed p-6 transition-colors sm:p-10',
        over ? 'border-ink bg-accent text-on-accent' : error ? 'border-danger bg-surface' : 'border-border-strong bg-surface',
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center bg-ink text-ink-accent">
            <Icon name="upload" size={20} />
          </span>
          <div>
            <p className="headline text-title-2">{over ? 'Drop it' : 'Drop a recording here'}</p>
            <p className="tag-label mt-2 text-subtle">Audio or video · English · two people · up to 3:00</p>
          </div>
        </div>
        <Button variant="primary" size="lg" icon="file" loading={busy} onClick={() => input.current?.click()} className="shrink-0">
          {busy ? 'Reading the audio…' : 'Choose a file'}
        </Button>
        <input
          ref={input}
          type="file"
          accept="audio/*,video/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-6 flex items-start gap-2 border-t-2 border-danger pt-4 text-body font-medium text-danger">
          <Icon name="review" size={16} className="mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
