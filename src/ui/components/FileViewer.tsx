import type { FilePayload } from "../../domain/fs-node.js";
import { MarkdownViewer } from "../viewers/MarkdownViewer.js";
import { HtmlViewer } from "../viewers/HtmlViewer.js";
import { CodeViewer } from "../viewers/CodeViewer.js";
import { ImageViewer } from "../viewers/ImageViewer.js";
import { TextViewer } from "../viewers/TextViewer.js";
import type { LineRange } from "../state/code-viewer.js";
import type { ResolvedTheme } from "../state/theme.js";

export function FileViewer({
  file,
  allowHtmlScripts,
  theme,
  selectedCodeRange,
  refreshedAt,
  onCodeSelectionChange,
}: {
  file: FilePayload | null;
  allowHtmlScripts: boolean;
  theme: ResolvedTheme;
  selectedCodeRange: LineRange | null;
  refreshedAt?: number;
  onCodeSelectionChange: (range: LineRange | null) => void;
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

  if (file.viewerKind === "markdown") return <MarkdownViewer file={file} />;
  if (file.viewerKind === "html")
    return <HtmlViewer file={file} allowHtmlScripts={allowHtmlScripts} />;
  if (file.viewerKind === "code" || file.viewerKind === "json")
    return (
      <CodeViewer
        file={formatStructuredFile(file)}
        theme={theme}
        selectedRange={selectedCodeRange}
        refreshedAt={refreshedAt}
        onSelectionChange={onCodeSelectionChange}
      />
    );
  if (file.viewerKind === "image") return <ImageViewer file={file} />;
  if (file.viewerKind === "text") return <TextViewer file={file} />;

  return (
    <div className="unsupported">
      <h2>{file.path}</h2>
      <p>This file type is not supported yet.</p>
    </div>
  );
}

function formatStructuredFile(file: FilePayload): FilePayload {
  if (file.viewerKind !== "json") return file;
  try {
    return {
      ...file,
      content: `${JSON.stringify(JSON.parse(file.content), null, 2)}\n`,
    };
  } catch {
    return file;
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
