import type {
  ChangeReviewSummary,
  DiffBaseSummary,
  TextDiff,
} from "../domain/change-review.js";
import type {
  FilePayload,
  FsEvent,
  TreeSnapshot,
  ViewerConfig,
} from "../domain/fs-node.js";
import {
  collectSearchableFiles,
  searchFilePayload,
  type TextSearchResult,
} from "../domain/search.js";
import type { ViewerServiceOptions } from "./contracts.js";

export class ViewerService {
  private readonly fileSystem: ViewerServiceOptions["fileSystem"];
  private readonly watcher?: ViewerServiceOptions["watcher"];
  private readonly changeReview?: ViewerServiceOptions["changeReview"];
  private subscribers = new Set<(event: FsEvent) => void>();

  constructor(options: ViewerServiceOptions) {
    this.fileSystem = options.fileSystem;
    this.watcher = options.watcher;
    this.changeReview = options.changeReview;
  }

  readTree(): Promise<TreeSnapshot> {
    return this.fileSystem.readTree();
  }

  readFile(relativePath: string): Promise<FilePayload> {
    return this.fileSystem.readFile(relativePath);
  }

  readHtmlPreview(relativePath: string): Promise<string> {
    return this.fileSystem.readHtmlPreview(relativePath);
  }

  async searchText(
    query: string,
    options: { limit?: number; matchesPerFile?: number } = {},
  ): Promise<{ query: string; results: TextSearchResult[] }> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { query: normalizedQuery, results: [] };

    const limit = options.limit ?? 40;
    const matchesPerFile = options.matchesPerFile ?? 3;
    const tree = await this.fileSystem.readTree();
    const results: TextSearchResult[] = [];

    for (const file of collectSearchableFiles(tree.nodes)) {
      try {
        const payload = await this.fileSystem.readFile(file.path);
        results.push(
          ...searchFilePayload(payload, normalizedQuery, matchesPerFile),
        );
      } catch {
        // Search is best-effort because files may change between tree scan and read.
      }
      if (results.length >= limit) break;
    }

    return { query: normalizedQuery, results: results.slice(0, limit) };
  }

  getConfig(): ViewerConfig {
    return (
      this.fileSystem.getConfig?.() ?? {
        root: ".",
        allowHtmlScripts: false,
        maxFileSizeBytes: 1024 * 1024,
      }
    );
  }

  readChanges(): Promise<ChangeReviewSummary> {
    return (
      this.changeReview?.readChanges() ??
      Promise.resolve({
        available: false,
        reason: "Git change review is unavailable for this workspace.",
        changes: [],
      })
    );
  }

  readDiff(relativePath: string, baseRef?: string): Promise<TextDiff> {
    return (
      this.changeReview?.readDiff(relativePath, baseRef) ??
      Promise.resolve({
        path: relativePath,
        status: "unavailable",
        baseLabel: baseRef ?? "HEAD",
        compareLabel: "working tree",
        content: "",
        reason: "Git change review is unavailable for this workspace.",
      })
    );
  }

  readDiffBases(): Promise<DiffBaseSummary> {
    return (
      this.changeReview?.readDiffBases?.() ??
      Promise.resolve({
        available: false,
        reason: "Git diff base selection is unavailable for this workspace.",
        options: [],
      })
    );
  }

  subscribe(listener: (event: FsEvent) => void): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  async start(): Promise<void> {
    await this.watcher?.start((event) => {
      for (const subscriber of this.subscribers) subscriber(event);
    });
  }

  async stop(): Promise<void> {
    await this.watcher?.stop();
    this.subscribers.clear();
  }
}
