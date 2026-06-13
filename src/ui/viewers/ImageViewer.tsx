import type { FilePayload } from '../../domain/fs-node.js';

export function ImageViewer({ file }: { file: FilePayload }) {
  return <img className="image-preview" src={`/api/file?path=${encodeURIComponent(file.path)}`} alt={file.path} />;
}
