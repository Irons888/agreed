import { RecordingRow } from '@/components/domain/history';
import { Page } from '@/components/domain/layout';
import { Button } from '@/components/ui/button';
import { forgetRun, useHistory } from '@/lib/history';

/** Every recording analysed in this browser, newest first. */
export function HistoryPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const history = useHistory();
  return (
    <Page>
      <h1 className="heading text-title-1 text-text">History</h1>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Recordings analysed in this browser. Each result stays on the server for 30 days and is shared only if you send its link.
      </p>
      {history.length ? (
        <ul className="mt-8 border-2 border-border-strong bg-surface px-4">
          {history.map((entry) => (
            <RecordingRow key={entry.id} entry={entry} onOpen={() => onNavigate(`/r/${entry.id}`)} onForget={() => forgetRun(entry.id)} />
          ))}
        </ul>
      ) : (
        <div className="mt-8 border-2 border-dashed border-border-strong p-6">
          <p className="text-body text-muted">No recordings yet. Results you get here will be listed so you can come back to them.</p>
          <Button variant="primary" icon="upload" className="mt-4" onClick={() => onNavigate('/')}>
            Analyze a recording
          </Button>
        </div>
      )}
    </Page>
  );
}
