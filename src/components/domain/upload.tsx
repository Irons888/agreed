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
        'rounded-panel border-2 border-dashed px-6 py-10 text-center transition-colors',
        over ? 'border-focus bg-speaker-1-bg' : error ? 'border-danger bg-surface' : 'border-border-strong bg-surface',
      )}
    >
      <span className="mx-auto inline-flex size-11 items-center justify-center rounded-full bg-surface-muted text-muted">
        <Icon name="upload" size={20} />
      </span>
      <p className="mt-4 text-title-3 font-semibold text-text">Drop a recording here</p>
      <p className="mt-1 text-body text-muted">Audio or video · English · two people · up to 3 minutes</p>
      <Button variant="primary" size="lg" className="mt-6" icon="file" loading={busy} onClick={() => input.current?.click()}>
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
      {error && (
        <p role="alert" className="mx-auto mt-5 flex max-w-md items-start justify-center gap-2 text-body text-danger">
          <Icon name="review" size={16} className="mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
