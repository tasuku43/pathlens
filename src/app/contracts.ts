import type { FilePayload, FsEvent, TreeSnapshot } from '../domain/fs-node.js';

export interface FileSystemPort {
  readTree(): Promise<TreeSnapshot>;
  readFile(relativePath: string): Promise<FilePayload>;
  readHtmlPreview(relativePath: string): Promise<string>;
}

export interface WatcherPort {
  start(onEvent: (event: FsEvent) => void): Promise<void>;
  stop(): Promise<void>;
}

export interface ViewerServiceOptions {
  fileSystem: FileSystemPort;
  watcher?: WatcherPort;
}
