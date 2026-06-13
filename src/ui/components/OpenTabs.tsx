export interface OpenTab {
  path: string;
  viewerKind: string;
  changed?: boolean;
}

interface Props {
  tabs: OpenTab[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

export function OpenTabs({ tabs, activePath, onActivate, onClose }: Props) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button key={tab.path} className={`tab ${tab.path === activePath ? 'active' : ''} ${tab.changed ? 'changed' : ''}`} onClick={() => onActivate(tab.path)}>
          <span>{labelFor(tab.viewerKind)}</span>
          <span>{basename(tab.path)}</span>
          <span
            className="tab-close"
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onClose(tab.path);
            }}
          >
            x
          </span>
        </button>
      ))}
    </div>
  );
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path;
}

function labelFor(kind: string): string {
  if (kind === 'markdown') return 'MD';
  if (kind === 'html') return 'HTML';
  if (kind === 'image') return 'IMG';
  if (kind === 'code' || kind === 'json') return '{}';
  return 'FILE';
}
