import type { FilePayload, FsNode } from "../../domain/fs-node.js";
import { buildCodeMetadata, type LineRange } from "../state/code-viewer.js";
import { iconForPath } from "../state/file-icons.js";
import type { OutlineHeading } from "../state/outline.js";
import { eventLabel, type ReviewEvent } from "../state/review-events.js";

interface Props {
  file: FilePayload | null;
  outline: OutlineHeading[];
  events: ReviewEvent[];
  reviewTargets: FsNode[];
  selectedCodeRange: LineRange | null;
  refreshedAt?: number;
  activePaneId: string;
  onOutlineSelect: (id: string) => void;
  onOpenEventPath: (path: string) => void;
  onOpenAllChanged: () => void;
  onTargetHoverChange: (hovering: boolean) => void;
  onRevealTarget: () => void;
}

export function Inspector({
  file,
  outline,
  events,
  reviewTargets,
  selectedCodeRange,
  refreshedAt,
  activePaneId,
  onOutlineSelect,
  onOpenEventPath,
  onOpenAllChanged,
  onTargetHoverChange,
  onRevealTarget,
}: Props) {
  const codeMetadata =
    file && (file.viewerKind === "code" || file.viewerKind === "json")
      ? buildCodeMetadata(file, selectedCodeRange)
      : null;
  const changedFileEvents = events.filter(
    (item) =>
      item.event.type === "change" ||
      (item.event.type === "add" && item.event.kind === "file"),
  );

  return (
    <aside className="inspector">
      <div className="panel-title">
        <span>{codeMetadata ? "Code inspector" : "Inspector"}</span>
        <span className="pill">Read-only</span>
      </div>
      <div className="inspect-body">
        <button
          className="focus-target"
          onClick={onRevealTarget}
          onMouseEnter={() => onTargetHoverChange(true)}
          onMouseLeave={() => onTargetHoverChange(false)}
          type="button"
        >
          <span>Inspector target</span>
          <strong>{inspectorTargetLabel(file, activePaneId)}</strong>
        </button>
        <div className="kv">
          <span>Type</span>
          <strong>{file?.viewerKind ?? "none"}</strong>
        </div>
        <div className="kv">
          <span>Path</span>
          <strong>{file?.path ?? "No file selected"}</strong>
        </div>
        <div className="kv">
          <span>Status</span>
          <strong>{refreshedAt ? "Refreshed" : "Watching"}</strong>
        </div>
        <div className="kv">
          <span>Size</span>
          <strong>{file ? formatBytes(file.size) : "-"}</strong>
        </div>
        <div className="kv">
          <span>Updated</span>
          <strong>
            {file ? new Date(file.mtimeMs).toLocaleTimeString() : "-"}
          </strong>
        </div>
        {refreshedAt ? (
          <div className="kv">
            <span>Reloaded</span>
            <strong>{new Date(refreshedAt).toLocaleTimeString()}</strong>
          </div>
        ) : null}

        {codeMetadata ? (
          <>
            <h3 className="section-title">Code facts</h3>
            <div className="kv">
              <span>Language</span>
              <strong>{codeMetadata.language}</strong>
            </div>
            <div className="kv">
              <span>Lines</span>
              <strong>{codeMetadata.lineCount}</strong>
            </div>
            <div className="kv">
              <span>Selection</span>
              <strong>{codeMetadata.selectedReference ?? "None"}</strong>
            </div>
            <h3 className="section-title">Symbols</h3>
            {codeMetadata.symbols.length ? (
              <nav className="symbol-list">
                {codeMetadata.symbols.slice(0, 14).map((symbol) => (
                  <a
                    href={`#L${symbol.line}`}
                    key={`${symbol.kind}-${symbol.name}-${symbol.line}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document
                        .querySelector<HTMLElement>(
                          `.code-line[data-line="${symbol.line}"]`,
                        )
                        ?.scrollIntoView({
                          block: "center",
                          behavior: "smooth",
                        });
                    }}
                  >
                    <span>{symbol.kind}</span>
                    <strong>{symbol.name}</strong>
                    <small>{symbol.line}</small>
                  </a>
                ))}
              </nav>
            ) : (
              <p className="muted">No lightweight symbols detected.</p>
            )}
          </>
        ) : (
          <>
            <h3 className="section-title">Document outline</h3>
            {outline.length ? (
              <nav className="outline">
                {outline.map((heading, index) => (
                  <a
                    key={heading.id}
                    className={`${heading.level === 2 ? "h2 " : ""}${index === 0 ? "active" : ""}`}
                    href={`#${heading.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onOutlineSelect(heading.id);
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="muted">
                Open a Markdown or HTML file to see H1/H2 headings.
              </p>
            )}
          </>
        )}

        <h3 className="section-title">Review targets</h3>
        {reviewTargets.length ? (
          reviewTargets.slice(0, 6).map((target) => (
            <button
              className="review-target"
              key={target.path}
              onClick={() => onOpenEventPath(target.path)}
              type="button"
            >
              <span className="file-icon">
                {iconForPath(target.path, target.viewerKind)}
              </span>
              <span>{target.path}</span>
              <small>
                {target.mtimeMs
                  ? new Date(target.mtimeMs).toLocaleTimeString()
                  : target.viewerKind}
              </small>
            </button>
          ))
        ) : (
          <p className="muted">No generated-review targets detected yet.</p>
        )}

        <div className="section-title with-action">
          <span>Review queue</span>
          {changedFileEvents.length ? (
            <button type="button" onClick={onOpenAllChanged}>
              Open changed
            </button>
          ) : null}
        </div>
        {events.length ? (
          events.slice(0, 8).map((item) => (
            <button
              className="event"
              disabled={item.event.type === "unlink"}
              key={item.id}
              onClick={() => onOpenEventPath(item.event.path)}
              type="button"
            >
              <b>{eventLabel(item.event)}</b>
              <span>{item.event.path}</span>
              <small>{new Date(item.receivedAt).toLocaleTimeString()}</small>
            </button>
          ))
        ) : (
          <p className="muted">No events yet.</p>
        )}
      </div>
    </aside>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function inspectorTargetLabel(
  file: FilePayload | null,
  paneId: string,
): string {
  const name = file?.path.split("/").filter(Boolean).at(-1) ?? "No file";
  return `${name} · ${paneId}`;
}
