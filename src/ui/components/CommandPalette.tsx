import { useEffect, useMemo, useState } from "react";
import type { FsNode } from "../../domain/fs-node.js";
import type {
  CommandAction,
  CommandActionId,
  PaletteItem,
} from "../state/command-actions.js";
import { buildPaletteItems } from "../state/command-actions.js";
import {
  clampPaletteSelection,
  movePaletteSelection,
} from "../state/command-palette.js";
import { iconForPath } from "../state/file-icons.js";

interface Props {
  open: boolean;
  query: string;
  nodes: FsNode[];
  actions: CommandAction[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onOpenPath: (path: string) => void;
  onRunAction: (id: CommandActionId) => void;
}

export function CommandPalette({
  open,
  query,
  nodes,
  actions,
  onQueryChange,
  onClose,
  onOpenPath,
  onRunAction,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = useMemo(
    () => buildPaletteItems(nodes, actions, query, 12),
    [nodes, actions, query],
  );
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
                runItem(results[activeIndex], onOpenPath, onRunAction);
              }
            }}
          />
        </div>
        <div className="palette-body">
          <div className="palette-results" role="listbox">
            {results.map((item, index) => (
              <button
                disabled={item.kind === "action" && item.disabled}
                id={`palette-result-${index}`}
                key={item.id}
                role="option"
                className={
                  index === activeIndex
                    ? "palette-result active"
                    : "palette-result"
                }
                aria-selected={index === activeIndex}
                onClick={() => runItem(item, onOpenPath, onRunAction)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="file-icon">
                  {item.kind === "file"
                    ? iconForPath(item.path, item.viewerKind)
                    : "CMD"}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="palette-type">
                  {item.kind === "file" ? "Open" : "Run"}
                </span>
              </button>
            ))}
            {!results.length && (
              <p className="muted palette-empty">No matching files.</p>
            )}
          </div>
          <aside className="palette-help">
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

function runItem(
  item: PaletteItem,
  onOpenPath: (path: string) => void,
  onRunAction: (id: CommandActionId) => void,
) {
  if (item.kind === "file") {
    onOpenPath(item.path);
    return;
  }
  if (!item.disabled) onRunAction(item.id);
}
