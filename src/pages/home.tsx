import type { ReactNode } from 'react';
import { RecordingRow, TaskRow } from '@/components/domain/history';
import { Hero } from '@/components/domain/landing';
import { ExampleButtons, type Sample } from '@/components/domain/samples';
import { UploadDropzone } from '@/components/domain/upload';
import { Button } from '@/components/ui/button';
import type { PreparedAudio } from '@/lib/audio/prepare';
import { isExpired, useHistory, type TaskSummary } from '@/lib/history';
import { useSamples, useStart } from './use-start';

const container = 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8';

// Two of the test recordings: a call spoken like a real one, and the one whose dates resolve. The rest are on the Quality page.
const EXAMPLES = ['T8-natural-call', 'T4-dated'];
const MAIN_EXAMPLE = 'T8-natural-call';

// What T8 gives, written out, for people who haven't run anything yet. It illustrates the output; runs are always live.
const EXAMPLE_RESULT: TaskSummary[] = [
  { id: 'x1', title: 'Send the API docs to the partner team', status: 'agreed', owner: 'Tom', deadline: '“by Wednesday”', at: 27 },
  { id: 'x2', title: 'Have the staging demo up', status: 'agreed', owner: 'Tom', deadline: '“Monday”, moved from “Thursday”', at: 112 },
  { id: 'x3', title: 'Update the privacy policy page', status: 'agreed', owner: null, deadline: '“before launch”', at: 76 },
  { id: 'x4', title: 'Look into the flaky payment tests', status: 'needs_review', owner: 'Tom', deadline: '“this week”', at: 92 },
  { id: 'x5', title: 'Does the client need single sign-on?', status: 'open_question', owner: null, deadline: null, at: 83 },
  { id: 'x6', title: 'Add dark mode', status: 'not_accepted', owner: null, deadline: null, at: 45 },
  { id: 'x7', title: 'Book the big room for the client workshop', status: 'cancelled', owner: 'Sophia', deadline: null, at: 61 },
];

function Block({ title, link, onLink, children }: { title: string; link?: string; onLink?: () => void; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-4">
        <h2 className="heading text-title-2 text-text">{title}</h2>
        {link && (
          <button type="button" onClick={onLink} className="text-label font-semibold text-text underline decoration-2 underline-offset-4 hover:bg-accent hover:text-on-accent">
            {link}
          </button>
        )}
      </div>
      <ul className="mt-3 border-2 border-border-strong bg-surface px-4">{children}</ul>
    </div>
  );
}

export function HomePage({ onStart, onNavigate }: { onStart: (audio: PreparedAudio, prepareMs: number) => void; onNavigate: (path: string) => void }) {
  const samples = useSamples();
  const { busy, error, startFile, startSample } = useStart(onStart);
  const examples = (samples ?? []).filter((s) => EXAMPLES.includes(s.case));
  const main: Sample | undefined = examples.find((s) => s.case === MAIN_EXAMPLE);

  const history = useHistory().filter((e) => !isExpired(e));
  const latestTasks = history
    .filter((e) => e.outcome !== 'decline')
    .flatMap((entry) => entry.items.filter((t) => t.status === 'agreed' || t.status === 'needs_review').map((task) => ({ task, entry })))
    .slice(0, 5);

  return (
    <main>
      <Hero>
        <div className="surface-light">
          <UploadDropzone busy={busy === 'upload'} error={error} onFile={startFile} />
        </div>
        {examples.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-body text-muted">No recording at hand? Try one of ours:</span>
            <ExampleButtons samples={examples} busyCase={busy} onRun={startSample} />
          </div>
        )}
        <p className="mt-8 text-caption text-subtle">Kept 30 days so the quotes stay playable · delete any time · no account needed</p>
      </Hero>

      <section className={`${container} py-14`}>
        {history.length ? (
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <Block title="Recent recordings" link="All history" onLink={() => onNavigate('/history')}>
              {history.slice(0, 3).map((entry) => (
                <RecordingRow key={entry.id} entry={entry} onOpen={() => onNavigate(`/r/${entry.id}`)} />
              ))}
            </Block>
            <Block title="Latest tasks" link="All tasks" onLink={() => onNavigate('/tasks')}>
              {latestTasks.length ? (
                latestTasks.map(({ task, entry }) => (
                  <TaskRow key={`${entry.id}:${task.id}`} task={task} from={entry.fileName} onOpen={() => onNavigate(`/r/${entry.id}#${task.id}`)} />
                ))
              ) : (
                <li className="py-4 text-body text-muted">No agreed tasks yet.</li>
              )}
            </Block>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-caption font-medium text-muted">Example</p>
              <h2 className="heading mt-1 text-title-2 text-text">What you get from a 2½-minute call</h2>
              <p className="mt-2 max-w-md text-body text-muted">
                The tasks, written out with who and by when. A promise made with “I'll try” waits for your check. A proposal nobody accepted and a task
                that was called off are listed apart, so nothing dropped passes for a task. Every line keeps the quote it comes from; run the call to
                hear them.
              </p>
              {main && (
                <Button className="mt-5" icon="play" loading={busy === main.case} disabled={busy !== null && busy !== main.case} onClick={() => startSample(main)}>
                  Run this call live
                </Button>
              )}
            </div>
            <ul className="border-2 border-border-strong bg-surface px-4">
              {EXAMPLE_RESULT.map((task) => (
                <TaskRow key={task.id} task={task} from="example call" />
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
