import { useEffect, useState } from 'react';
import { HowItWorks, NonGoals } from '@/components/domain/landing';
import { Page } from '@/components/domain/layout';
import { SampleList, type Sample } from '@/components/domain/samples';
import { UploadDropzone } from '@/components/domain/upload';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { AudioProblem, prepareAudio, prepareSample, type PreparedAudio } from '@/lib/audio/prepare';

export function HomePage({ onStart }: { onStart: (audio: PreparedAudio, prepareMs: number) => void }) {
  // undefined while loading, [] if the list could not be loaded
  const [samples, setSamples] = useState<Sample[] | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/samples/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  const start = async (key: string, prepare: () => Promise<PreparedAudio>) => {
    setBusy(key);
    setError(null);
    const t = performance.now();
    try {
      onStart(await prepare(), performance.now() - t);
    } catch (err) {
      setError(err instanceof AudioProblem ? err.message : 'The recording could not be read.');
      setBusy(null);
    }
  };

  return (
    <Page className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
        <div>
          <h1 className="text-display-sm font-semibold text-text sm:text-display">Final commitments from a recorded conversation.</h1>
          <p className="mt-4 max-w-xl text-body-lg text-muted">
            Upload a project discussion. Get the agreed tasks, owners, deadlines and open questions, each backed by a quote you can play.
          </p>
          <div className="mt-8">
            <UploadDropzone busy={busy === 'upload'} error={error} onFile={(file) => start('upload', () => prepareAudio(file, file.name))} />
          </div>
          <p className="mt-4 flex items-start gap-2 text-caption text-subtle">
            <Icon name="info" size={14} className="mt-px" />
            The audio is converted in your browser and processed on Cloudflare Workers AI. The recording and its result are kept for 30 days, and you can delete them at any time.
          </p>
        </div>
        <div>
          <h2 className="text-title-3 font-semibold text-text">Or try a test recording</h2>
          <p className="mt-1 text-body text-muted">Each one is processed live, nothing is cached. Expected results were written before the product existed.</p>
          <div className="mt-4">
            {samples === undefined ? (
              <div className="space-y-2" aria-label="Loading test recordings">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-card" />
                ))}
              </div>
            ) : samples.length ? (
              <SampleList samples={samples} busyCase={busy} onRun={(s) => start(s.case, () => prepareSample(s.url, `${s.case}.wav`))} />
            ) : (
              <p className="rounded-panel border border-dashed border-border-strong p-4 text-body text-muted">Test recordings are not available.</p>
            )}
          </div>
        </div>
      </section>
      <HowItWorks />
      <NonGoals />
    </Page>
  );
}
