import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import type { WatcherPort } from '../app/contracts.js';
import type { FsEvent } from '../domain/fs-node.js';
import { normalizeRelativePath } from '../domain/path-policy.js';

export class NodeWatcher implements WatcherPort {
  private watcher: FSWatcher | null = null;
  private version = 1;

  constructor(private readonly rootDir: string) {}

  async start(onEvent: (event: FsEvent) => void): Promise<void> {
    // This is an MVP placeholder. A production implementation should use a robust watcher
    // and normalize add/unlink events accurately across platforms.
    this.watcher = watch(this.rootDir, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      const normalized = normalizeRelativePath(String(filename).split(path.sep).join('/'));
      if (!normalized.ok || !normalized.relativePath) return;
      onEvent({ type: 'change', path: normalized.relativePath, version: ++this.version });
    });
  }

  async stop(): Promise<void> {
    this.watcher?.close();
    this.watcher = null;
  }
}
