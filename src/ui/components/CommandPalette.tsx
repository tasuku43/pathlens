import type { FsNode } from '../../domain/fs-node.js';

interface Props {
  open: boolean;
  query: string;
  nodes: FsNode[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onOpenPath: (path: string) => void;
}

export function CommandPalette({ open, query, nodes, onQueryChange, onClose, onOpenPath }: Props) {
  if (!open) return null;

  const files = flattenFiles(nodes);
  const normalizedQuery = query.trim().toLowerCase();
  const results = files
    .filter((file) => !normalizedQuery || file.path.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);

  return (
    <div className="palette-overlay" role="presentation" onClick={onClose}>
      <section className="palette" role="dialog" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <div className="palette-top">
          <input
            autoFocus
            className="palette-input"
            placeholder="Open file or run command..."
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
          />
        </div>
        <div className="palette-body">
          <div className="palette-results">
            {results.map((file, index) => (
              <button
                key={file.path}
                className={index === 0 ? 'palette-result active' : 'palette-result'}
                onClick={() => onOpenPath(file.path)}
              >
                <span>{iconFor(file.viewerKind)}</span>
                <span>
                  <strong>{file.path}</strong>
                  <small>{file.viewerKind ?? 'file'}</small>
                </span>
                <span className="palette-type">Open</span>
              </button>
            ))}
          </div>
          <aside className="palette-help">
            <p>Command K is modal. It should preserve the sidebar, tabs, viewer, and outline state underneath.</p>
            <div><span>Open</span><kbd>Enter</kbd></div>
            <div><span>New tab</span><kbd>Cmd Enter</kbd></div>
            <div><span>Close</span><kbd>Esc</kbd></div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function flattenFiles(nodes: FsNode[]): FsNode[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'directory') return flattenFiles(node.children ?? []);
    return [node];
  });
}

function iconFor(kind: FsNode['viewerKind']): string {
  if (kind === 'markdown') return 'MD';
  if (kind === 'html') return 'HTML';
  if (kind === 'image') return 'IMG';
  if (kind === 'code' || kind === 'json') return '{}';
  return 'FILE';
}
