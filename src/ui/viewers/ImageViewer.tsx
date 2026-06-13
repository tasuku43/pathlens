import { useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";

export function ImageViewer({ file }: { file: FilePayload }) {
  const [fit, setFit] = useState<"fit" | "actual">("fit");
  const src =
    file.encoding === "base64" && file.mimeType
      ? `data:${file.mimeType};base64,${file.content}`
      : "";
  if (!src) {
    return (
      <div className="unsupported">
        <h2>{file.path}</h2>
        <p>This image could not be previewed.</p>
      </div>
    );
  }
  return (
    <section className="image-viewer">
      <div className="viewer-toolbar">
        <strong>{file.path}</strong>
        <span>
          {formatBytes(file.size)}
          {file.mimeType === "image/svg+xml"
            ? " · SVG as image, scripts inactive"
            : ""}
        </span>
        <div className="segmented-control" aria-label="Image size mode">
          <button
            className={fit === "fit" ? "active" : ""}
            type="button"
            onClick={() => setFit("fit")}
          >
            Fit
          </button>
          <button
            className={fit === "actual" ? "active" : ""}
            type="button"
            onClick={() => setFit("actual")}
          >
            Actual
          </button>
        </div>
      </div>
      <div className={fit === "fit" ? "image-stage fit" : "image-stage actual"}>
        <img className="image-preview" src={src} alt={file.path} />
      </div>
    </section>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
