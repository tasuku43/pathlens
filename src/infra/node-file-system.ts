import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FileSystemPort } from '../app/contracts.js';
import type { FilePayload, FsNode, TreeSnapshot } from '../domain/fs-node.js';
import { defaultIgnoredNames, isIgnoredPath, normalizeRelativePath } from '../domain/path-policy.js';
import { classifyViewer } from '../domain/viewer-kind.js';

export interface NodeFileSystemOptions {
  rootDir: string;
  ignoredNames?: Set<string>;
  version?: number;
}

export class NodeFileSystem implements FileSystemPort {
  private readonly rootDir: string;
  private readonly ignoredNames: Set<string>;
  private version: number;

  constructor(options: NodeFileSystemOptions) {
    this.rootDir = path.resolve(options.rootDir);
    this.ignoredNames = options.ignoredNames ?? defaultIgnoredNames;
    this.version = options.version ?? 1;
  }

  async readTree(): Promise<TreeSnapshot> {
    const nodes = await this.scanDirectory('', null);
    return { root: this.rootDir, version: this.version, nodes };
  }

  async readFile(relativePath: string): Promise<FilePayload> {
    const resolved = this.resolveInsideRoot(relativePath);
    const stat = await fs.stat(resolved.absolutePath);
    if (!stat.isFile()) throw new Error('path is not a file');
    const content = await fs.readFile(resolved.absolutePath, 'utf8');
    const etag = `sha256:${createHash('sha256').update(content).digest('hex')}`;
    return {
      path: resolved.relativePath,
      viewerKind: classifyViewer(resolved.relativePath),
      encoding: 'utf8',
      content,
      etag,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  }

  async readHtmlPreview(relativePath: string): Promise<string> {
    const file = await this.readFile(relativePath);
    if (file.viewerKind !== 'html') throw new Error('path is not an HTML file');
    return file.content;
  }

  private async scanDirectory(relativeDir: string, parentPath: string | null): Promise<FsNode[]> {
    const absoluteDir = path.join(this.rootDir, relativeDir);
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    const nodes: FsNode[] = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (isIgnoredPath(relativePath, this.ignoredNames)) continue;

      const absolutePath = path.join(this.rootDir, relativePath);
      const stat = await fs.stat(absolutePath);
      if (entry.isDirectory()) {
        nodes.push({
          id: relativePath,
          path: relativePath,
          name: entry.name,
          kind: 'directory',
          parentPath,
          children: await this.scanDirectory(relativePath, relativePath),
          mtimeMs: stat.mtimeMs,
          version: this.version,
        });
      } else if (entry.isFile()) {
        nodes.push({
          id: relativePath,
          path: relativePath,
          name: entry.name,
          kind: 'file',
          parentPath,
          viewerKind: classifyViewer(relativePath),
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          version: this.version,
        });
      }
    }

    return nodes;
  }

  private resolveInsideRoot(input: string): { absolutePath: string; relativePath: string } {
    const normalized = normalizeRelativePath(input);
    if (!normalized.ok) throw new Error(normalized.reason);
    if (!normalized.relativePath) throw new Error('file path is required');
    if (isIgnoredPath(normalized.relativePath, this.ignoredNames)) throw new Error('path is ignored');
    const absolutePath = path.resolve(this.rootDir, normalized.relativePath);
    const relativeToRoot = path.relative(this.rootDir, absolutePath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      throw new Error('path escapes root');
    }
    return { absolutePath, relativePath: normalized.relativePath };
  }
}
