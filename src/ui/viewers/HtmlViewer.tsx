import type { FilePayload } from '../../domain/fs-node.js';

export function HtmlViewer({ file }: { file: FilePayload }) {
  return (
    <iframe
      className="html-frame"
      title={file.path}
      sandbox=""
      src={`/preview/html?path=${encodeURIComponent(file.path)}`}
    />
  );
}
