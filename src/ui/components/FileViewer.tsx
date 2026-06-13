import type { FilePayload } from "../../domain/fs-node.js";
import { MarkdownViewer } from "../viewers/MarkdownViewer.js";
import { HtmlViewer } from "../viewers/HtmlViewer.js";
import { CodeViewer } from "../viewers/CodeViewer.js";
import { CsvViewer, isDelimitedPath } from "../viewers/CsvViewer.js";
import { ImageViewer } from "../viewers/ImageViewer.js";
import { JsonViewer } from "../viewers/JsonViewer.js";
import { MermaidViewer } from "../viewers/MermaidViewer.js";
import { TextViewer } from "../viewers/TextViewer.js";
import type { LineRange } from "../state/code-viewer.js";
import type { ResolvedTheme } from "../state/theme.js";
import type { ViewerMode } from "../state/viewer-mode.js";

export function FileViewer({
  file,
  allowHtmlScripts,
  theme,
  selectedCodeRange,
  viewerMode,
  refreshedAt,
  onCodeSelectionChange,
  onViewerModeChange,
}: {
  file: FilePayload | null;
  allowHtmlScripts: boolean;
  theme: ResolvedTheme;
  selectedCodeRange: LineRange | null;
  viewerMode?: ViewerMode;
  refreshedAt?: number;
  onCodeSelectionChange: (range: LineRange | null) => void;
  onViewerModeChange?: (mode: ViewerMode) => void;
}) {
  if (!file)
    return <div className="empty-viewer">Select a file from the tree.</div>;

  if (file.truncated) {
    return (
      <div className="unsupported">
        <h2>{file.path}</h2>
        <p>
          This file is {formatBytes(file.size)}, which is larger than the{" "}
          {formatBytes(file.maxSizeBytes ?? 0)} preview limit.
        </p>
      </div>
    );
  }

  if (file.viewerKind === "markdown")
    return (
      <MarkdownViewer
        file={file}
        mode={viewerMode}
        onModeChange={onViewerModeChange}
      />
    );
  if (file.viewerKind === "html")
    return (
      <HtmlViewer
        file={file}
        allowHtmlScripts={allowHtmlScripts}
        mode={viewerMode}
        onModeChange={onViewerModeChange}
      />
    );
  if (file.viewerKind === "json") return <JsonViewer file={file} />;
  if (file.viewerKind === "mermaid") return <MermaidViewer file={file} />;
  if (file.viewerKind === "code")
    return (
      <CodeViewer
        file={file}
        theme={theme}
        selectedRange={selectedCodeRange}
        refreshedAt={refreshedAt}
        onSelectionChange={onCodeSelectionChange}
      />
    );
  if (file.viewerKind === "text" && isDelimitedPath(file.path))
    return <CsvViewer file={file} />;
  if (file.viewerKind === "image") return <ImageViewer file={file} />;
  if (file.viewerKind === "text") return <TextViewer file={file} />;

  return (
    <div className="unsupported">
      <h2>{file.path}</h2>
      <p>This file type is not supported yet.</p>
    </div>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
