import { useEffect, useState } from 'react';
import { HowItWorks, Hero, MeasuredBand, NonGoals, SectionHead, type Measured } from '@/components/domain/landing';
import { SampleList, type Sample } from '@/components/domain/samples';
import { UploadDropzone } from '@/components/domain/upload';
import { Skeleton } from '@/components/ui/skeleton';
import { AudioProblem, prepareAudio, prepareSample, type PreparedAudio } from '@/lib/audio/prepare';
import { seconds, usd } from '@/lib/format';

const container = 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8';

type Report = { summary: { passed: number; runs: number; exclusionErrors: number; timeToResultMs: { p50: number | null }; costPerAudioMinuteUsd: number | null } };

export function HomePage({ onStart, onNavigate }: { onStart: (audio: PreparedAudio, prepareMs: number) => void; onNavigate: (path: string) => void }) {
  // undefined while loading, [] if the list could not be loaded
  const [samples, setSamples] = useState<Sample[] | undefined>(undefined);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/samples/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch(() => setSamples([]));
    fetch('/quality/latest.json')
      .then((r) => (r.ok ? (r.json() as Promise<Report>) : null))
      .then((report) => {
        if (!report) return;
        const s = report.summary;
        setMeasured({
          passed: `${s.passed}/${s.runs}`,
          unsupported: String(s.exclusionErrors),
          time: s.timeToResultMs.p50 != null ? seconds(s.timeToResultMs.p50).replace('.0 s', ' s') : '—',
          cost: s.costPerAudioMinuteUsd != null ? usd(s.costPerAudioMinuteUsd) : '—',
        });
      })
      .catch(() => setMeasured(null));
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
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main>
      <Hero onUpload={() => scrollTo('upload')} onSamples={() => scrollTo('samples')} />

      <section id="upload" className={`${container} scroll-mt-8 py-20`}>
        <SectionHead
          eyebrow="Upload"
          title="Analyze your call"
          text="Any audio or video the browser can play: a call export, a voice memo, a screen recording. It is converted to 16 kHz mono before it leaves your computer."
        />
        <div className="mt-10">
          <UploadDropzone busy={busy === 'upload'} error={error} onFile={(file) => start('upload', () => prepareAudio(file, file.name))} />
        </div>
        <p className="tag-label mt-4 text-subtle">Kept 30 days so quotes stay playable · delete any time · no account needed</p>
      </section>

      <section id="samples" className="surface-dark scroll-mt-8">
        <div className={`${container} py-20`}>
          <SectionHead
            eyebrow="Six test recordings"
            title="Or run one of ours"
            text="Each one runs live, nothing is cached. Their expected results were written before the product existed."
          />
          <div className="mt-10">
            {samples === undefined ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading test recordings">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-72" />
                ))}
              </div>
            ) : samples.length ? (
              <SampleList samples={samples} busyCase={busy} onRun={(s) => start(s.case, () => prepareSample(s.url, `${s.case}.wav`))} />
            ) : (
              <p className="border-2 border-dashed border-border-strong p-5 text-body text-muted">Test recordings are not available.</p>
            )}
          </div>
        </div>
      </section>

      <HowItWorks />
      <NonGoals />
      {measured && <MeasuredBand measured={measured} onQuality={() => onNavigate('/quality')} />}
    </main>
  );
}
