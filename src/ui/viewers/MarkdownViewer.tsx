import { marked } from 'marked';
import type { FilePayload } from '../../domain/fs-node.js';

export function MarkdownViewer({ file }: { file: FilePayload }) {
  const html = marked.parse(file.content) as string;
  return <article className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
