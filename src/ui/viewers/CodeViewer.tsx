import type { FilePayload } from '../../domain/fs-node.js';

export function CodeViewer({ file }: { file: FilePayload }) {
  // Scaffold placeholder. Production implementation should use Shiki.
  return <pre className="code"><code>{file.content}</code></pre>;
}
