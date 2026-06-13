import { useEffect, useMemo, useState } from "react";
import type { FsNode } from "../../domain/fs-node.js";
import {
  clampPaletteSelection,
  movePaletteSelection,
} from "../state/command-palette.js";
import { iconForPath } from "../state/file-icons.js";
import { fuzzyFileResults } from "../state/files.js";

interface Props {
  open: boolean;
  query: string;
  nodes: FsNode[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onOpenPath: (path: string) => void;
}

export function CommandPalette({
  open,
  query,
  nodes,
  onQueryChange,
  onClose,
  onOpenPath,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = useMemo(() => fuzzyFileResults(nodes, query), [nodes, query]);
  const activeIndex = clampPaletteSelection(selectedIndex, results.length);

  useEffect(() => {
    if (open) setSelectedIndex(0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="palette-overlay" role="presentation" onClick={onClose}>
      <section
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="palette-top">
          <input
            autoFocus
            className="palette-input"
            placeholder="Open file or run command..."
            value={query}
            aria-activedescendant={
              activeIndex >= 0 ? `palette-result-${activeIndex}` : undefined
            }
            onChange={(event) => {
              setSelectedIndex(0);
              onQueryChange(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onClose();
                return;
              }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((index) =>
                  movePaletteSelection(
                    index,
                    results.length,
                    event.key === "ArrowDown" ? 1 : -1,
                  ),
                );
                return;
              }
              if (event.key === "Enter" && activeIndex >= 0) {
                onOpenPath(results[activeIndex].path);
              }
            }}
          />
        </div>
        <div className="palette-body">
          <div className="palette-results" role="listbox">
            {results.map((file, index) => (
              <button
                id={`palette-result-${index}`}
                key={file.path}
                role="option"
                className={
                  index === activeIndex
                    ? "palette-result active"
                    : "palette-result"
                }
                aria-selected={index === activeIndex}
                onClick={() => onOpenPath(file.path)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="file-icon">
                  {iconForPath(file.path, file.viewerKind)}
                </span>
                <span>
                  <strong>{file.path}</strong>
                  <small>{file.viewerKind ?? "file"}</small>
                </span>
                <span className="palette-type">Open</span>
              </button>
            ))}
            {!results.length && (
              <p className="muted palette-empty">No matching files.</p>
            )}
          </div>
          <aside className="palette-help">
            <p>
              Command K is modal. It should preserve the sidebar, tabs, viewer,
              and outline state underneath.
            </p>
            <div>
              <span>Open</span>
              <kbd>Enter</kbd>
            </div>
            <div>
              <span>New tab</span>
              <kbd>Cmd Enter</kbd>
            </div>
            <div>
              <span>Close</span>
              <kbd>Esc</kbd>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
