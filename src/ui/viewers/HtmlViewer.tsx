import { useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";
import type { ViewerMode } from "../state/viewer-mode.js";

export function HtmlViewer({
  file,
  allowHtmlScripts,
  mode: controlledMode,
  onModeChange,
}: {
  file: FilePayload;
  allowHtmlScripts: boolean;
  mode?: ViewerMode;
  onModeChange?: (mode: ViewerMode) => void;
}) {
  const [localMode, setLocalMode] = useState<"preview" | "source">("preview");
  const mode =
    controlledMode === "source" || controlledMode === "preview"
      ? controlledMode
      : localMode;
  const setMode = (nextMode: "preview" | "source") => {
    setLocalMode(nextMode);
    onModeChange?.(nextMode);
  };
  return (
    <section className="html-viewer">
      <div className="viewer-toolbar">
        <strong>{file.path}</strong>
        <span className="sandbox-status">
          sandboxed · scripts {allowHtmlScripts ? "on" : "off"}
        </span>
        <div className="segmented-control" aria-label="HTML view mode">
          <button
            className={mode === "preview" ? "active" : ""}
            type="button"
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
          <button
            className={mode === "source" ? "active" : ""}
            type="button"
            onClick={() => setMode("source")}
          >
            Source
          </button>
        </div>
      </div>
      {mode === "preview" ? (
        <iframe
          className="html-frame"
          title={file.path}
          sandbox={allowHtmlScripts ? "allow-scripts allow-same-origin" : ""}
          src={`/preview/html?path=${encodeURIComponent(file.path)}`}
        />
      ) : (
        <pre className="markdown-source">{file.content}</pre>
      )}
    </section>
  );
}
