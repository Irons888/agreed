import { useEffect, useState } from 'react';
import type { Sample } from '@/components/domain/samples';
import { AudioProblem, prepareAudio, prepareSample, type PreparedAudio } from '@/lib/audio/prepare';

/** Reads an upload or a test recording in the browser, then hands it to the run. One at a time. */
export function useStart(onStart: (audio: PreparedAudio, prepareMs: number) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (key: string, prepare: () => Promise<PreparedAudio>) => {
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
  return {
    busy,
    error,
    startFile: (file: File) => run('upload', () => prepareAudio(file, file.name)),
    startSample: (sample: Sample) => run(sample.case, () => prepareSample(sample.url, `${sample.case}.wav`)),
  };
}

/** The test recordings shipped with the app; undefined while loading, [] if they could not be loaded. */
export function useSamples() {
  const [samples, setSamples] = useState<Sample[] | undefined>(undefined);
  useEffect(() => {
    fetch('/samples/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);
  return samples;
}
