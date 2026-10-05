import { useCallback, useEffect, useRef, useState } from 'react';
import { Footer, TopNav } from '@/components/domain/layout';
import type { StepKey, StepState } from '@/components/domain/progress';
import { analyze } from '@/lib/api';
import type { PreparedAudio } from '@/lib/audio/prepare';
import { HomePage } from '@/pages/home';
import { QualityPage } from '@/pages/quality';
import { RunPage, type RunState } from '@/pages/run';
import { SavedRunPage } from '@/pages/saved-run';

const freshSteps = (prepareMs: number): Record<StepKey, StepState> => ({
  prepare: { status: 'done', ms: prepareMs },
  transcribe: { status: 'pending' },
  extract: { status: 'pending' },
  verify: { status: 'pending' },
});

/** Four screens do not need a router library: the path is state, history keeps the back button working. */
function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to: string, replace = false) => {
    if (to !== window.location.pathname) window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
    setPath(to);
    window.scrollTo({ top: 0 });
  }, []);
  return { path, navigate, setPath };
}

export function App() {
  const { path, navigate, setPath } = usePath();
  const [run, setRun] = useState<RunState | null>(null);
  const counter = useRef(0);
  const abort = useRef<AbortController | null>(null);

  const start = useCallback(
    (audio: PreparedAudio, prepareMs: number) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const key = ++counter.current;
      const startedAt = performance.now();
      const update = (fn: (r: RunState) => RunState) => setRun((current) => (current && current.key === key ? fn(current) : current));
      setRun({ key, audio, steps: freshSteps(prepareMs), transcript: null, result: null, error: null, clientMs: null });
      navigate('/run');

      analyze(
        audio.wav,
        audio.name,
        (event) => {
          if (event.type === 'stage') {
            update((r) => ({
              ...r,
              steps: {
                ...r.steps,
                [event.stage]: event.status === 'start' ? { status: 'active', startedAt: Date.now() } : { status: 'done', ms: event.ms },
              },
            }));
          }
          if (event.type === 'transcript') update((r) => ({ ...r, transcript: { speakers: event.speakers, turns: event.turns } }));
        },
        controller.signal,
      )
        .then((result) => {
          // In development the last result is kept on window, to save real fixtures for Storybook.
          if (import.meta.env.DEV) Object.assign(window, { __agreedLastResult: result });
          update((r) => ({ ...r, result, clientMs: Math.round(performance.now() - startedAt) }));
          // The finished result gets its own link; the page keeps what is already on screen.
          if (counter.current === key && window.location.pathname === '/run') {
            window.history.replaceState(null, '', `/r/${result.id}`);
            setPath(`/r/${result.id}`);
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          update((r) => ({
            ...r,
            error: err instanceof Error ? err.message : 'Processing failed.',
            steps: Object.fromEntries(
              Object.entries(r.steps).map(([k, s]) => [k, s.status === 'active' ? { ...s, status: 'error' } : s]),
            ) as Record<StepKey, StepState>,
          }));
        });
    },
    [navigate, setPath],
  );

  const removeRun = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('Delete failed.');
      setRun((current) => (current?.result?.id === id ? null : current));
      navigate('/');
    },
    [navigate],
  );

  // Without a run in memory there is nothing to show at /run.
  useEffect(() => {
    if (path === '/run' && !run) navigate('/', true);
  }, [path, run, navigate]);

  const goHome = () => navigate('/');
  const savedId = path.match(/^\/r\/([0-9a-f-]{36})$/)?.[1] ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav onNavigate={navigate} current={path === '/run' || savedId ? '/' : path} />
      <div className="flex-1">
        {path === '/quality' ? (
          <QualityPage />
        ) : savedId && run?.result?.id !== savedId ? (
          <SavedRunPage key={savedId} id={savedId} onNew={goHome} onDelete={removeRun} />
        ) : (path === '/run' || savedId) && run ? (
          <RunPage key={run.key} run={run} onNew={goHome} onRetry={() => start(run.audio, run.steps.prepare.ms ?? 0)} onDelete={removeRun} />
        ) : (
          <HomePage onStart={start} />
        )}
      </div>
      <Footer />
    </div>
  );
}
