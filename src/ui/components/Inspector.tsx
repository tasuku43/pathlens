import type { FilePayload, FsEvent } from '../../domain/fs-node.js';
import type { OutlineHeading } from '../state/outline.js';

interface Props {
  file: FilePayload | null;
  outline: OutlineHeading[];
  events: FsEvent[];
}

export function Inspector({ file, outline, events }: Props) {
  return (
    <aside className="inspector">
      <div className="panel-title"><span>Outline</span><span className="pill">H1/H2</span></div>
      <div className="inspect-body">
        <div className="kv"><span>Type</span><strong>{file?.viewerKind ?? 'none'}</strong></div>
        <div className="kv"><span>Path</span><strong>{file?.path ?? 'No file selected'}</strong></div>
        <div className="kv"><span>Status</span><strong>Watching</strong></div>

        <h3 className="section-title">Document outline</h3>
        {outline.length ? (
          <nav className="outline">
            {outline.map((heading, index) => (
              <a key={heading.id} className={`${heading.level === 2 ? 'h2 ' : ''}${index === 0 ? 'active' : ''}`} href={`#${heading.id}`}>
                {heading.text}
              </a>
            ))}
          </nav>
        ) : (
          <p className="muted">Open a Markdown file to see H1/H2 headings.</p>
        )}

        <h3 className="section-title">Recent file events</h3>
        {events.length ? events.slice(0, 5).map((event, index) => <div className="event" key={`${event.type}-${event.path}-${index}`}><b>{event.type}</b><span>{event.path}</span></div>) : <p className="muted">No events yet.</p>}
      </div>
    </aside>
  );
}
