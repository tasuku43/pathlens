import { useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";

export function HtmlViewer({
  file,
  allowHtmlScripts,
}: {
  file: FilePayload;
  allowHtmlScripts: boolean;
}) {
  const [mode, setMode] = useState<"preview" | "source">("preview");
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
