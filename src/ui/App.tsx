import { useEffect, useMemo, useState } from 'react';
import type { FilePayload, FsEvent, TreeSnapshot } from '../domain/fs-node.js';
import { TreeSidebar } from './components/TreeSidebar.js';
import { FileViewer } from './components/FileViewer.js';
import { OpenTabs, type OpenTab } from './components/OpenTabs.js';
import { Inspector } from './components/Inspector.js';
import { CommandPalette } from './components/CommandPalette.js';
import { extractMarkdownOutline } from './state/outline.js';

export function App() {
  const [tree, setTree] = useState<TreeSnapshot | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [file, setFile] = useState<FilePayload | null>(null);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [recentEvents, setRecentEvents] = useState<FsEvent[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadTree() {
    const response = await fetch('/api/tree');
    if (!response.ok) throw new Error(`tree request failed: ${response.status}`);
    setTree(await response.json());
  }

  async function loadFile(path: string) {
    setSelectedPath(path);
    const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`file request failed: ${response.status}`);
    const payload = (await response.json()) as FilePayload;
    setFile(payload);
    setOpenTabs((tabs) => {
      const existing = tabs.find((tab) => tab.path === payload.path);
      if (existing) return tabs.map((tab) => tab.path === payload.path ? { ...tab, viewerKind: payload.viewerKind, changed: false } : tab);
      return [...tabs, { path: payload.path, viewerKind: payload.viewerKind }];
    });
  }

  function closeTab(path: string) {
    setOpenTabs((tabs) => {
      const next = tabs.filter((tab) => tab.path !== path);
      if (path === selectedPath) {
        const fallback = next.at(-1)?.path ?? null;
        setSelectedPath(fallback);
        if (fallback) void loadFile(fallback);
        else setFile(null);
      }
      return next;
    });
  }

  function openFromPalette(path: string) {
    setPaletteOpen(false);
    setPaletteQuery('');
    void loadFile(path).catch((err) => setError(String(err)));
  }

  const outline = useMemo(() => {
    if (!file || file.viewerKind !== 'markdown') return [];
    return extractMarkdownOutline(file.content);
  }, [file]);

  useEffect(() => {
    loadTree().catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const events = new EventSource('/events');
    events.addEventListener('fs', (raw) => {
      const event = JSON.parse((raw as MessageEvent).data) as FsEvent;
      setRecentEvents((items) => [event, ...items].slice(0, 20));

      if (event.type === 'change' && event.path === selectedPath) {
        loadFile(event.path).catch((err) => setError(String(err)));
      } else if (event.type === 'change') {
        setOpenTabs((tabs) => tabs.map((tab) => tab.path === event.path ? { ...tab, changed: true } : tab));
      }

      if (event.type === 'add' || event.type === 'unlink') {
        loadTree().catch((err) => setError(String(err)));
      }
    });
    return () => events.close();
  }, [selectedPath]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="logo" />pathlens</div>
        <span className="pathbar">local workspace viewer</span>
        <button className="command-button" onClick={() => setPaletteOpen(true)}>Cmd/Ctrl K</button>
      </header>

      <div className="workbench">
        <aside className="sidebar">
          <div className="panel-title"><span>Explorer</span><span className="pill">live</span></div>
          {tree ? <TreeSidebar nodes={tree.nodes} selectedPath={selectedPath} onSelect={loadFile} /> : <p className="muted">Loading tree...</p>}
        </aside>

        <main className="main">
          <OpenTabs tabs={openTabs} activePath={selectedPath} onActivate={loadFile} onClose={closeTab} />
          <section className="viewer-pane">
            {error ? <div className="error">{error}</div> : <FileViewer file={file} />}
          </section>
        </main>

        <Inspector file={file} outline={outline} events={recentEvents} />
      </div>

      <footer className="statusbar">
        <span>{openTabs.length} tabs · {recentEvents.length} recent events</span>
        <span>localhost</span>
      </footer>

      <CommandPalette
        open={paletteOpen}
        query={paletteQuery}
        nodes={tree?.nodes ?? []}
        onQueryChange={setPaletteQuery}
        onClose={() => setPaletteOpen(false)}
        onOpenPath={openFromPalette}
      />
    </div>
  );
}
