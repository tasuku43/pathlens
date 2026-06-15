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
  type FileSearchResult,
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

  readDirectory(
    relativePath = "",
    options: { depth?: number } = {},
  ): Promise<TreeSnapshot> {
    return (
      this.fileSystem.readDirectory?.(relativePath, options) ??
      this.fileSystem.readTree()
    );
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

    if (this.fileSystem.searchText) {
      return this.fileSystem.searchText(normalizedQuery, options);
    }

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

  async searchFiles(
    query: string,
    options: { limit?: number } = {},
  ): Promise<{ query: string; results: FileSearchResult[] }> {
    const normalizedQuery = query.trim();
    if (this.fileSystem.searchFiles) {
      return this.fileSystem.searchFiles(normalizedQuery, options);
    }

    const limit = options.limit ?? 40;
    const tree = await this.fileSystem.readTree();
    const terms = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const results = collectSearchableFiles(tree.nodes)
      .map((file) => ({
        path: file.path,
        name: file.name,
        viewerKind: file.viewerKind,
        size: file.size,
        mtimeMs: file.mtimeMs,
        score: fallbackFileScore(file.path.toLowerCase(), terms),
      }))
      .filter((result) => !terms.length || result.score > 0)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, limit);

    return { query: normalizedQuery, results };
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

function fallbackFileScore(path: string, terms: string[]): number {
  if (!terms.length) return 1;
  let score = 0;
  for (const term of terms) {
    const index = path.indexOf(term);
    if (index < 0) return 0;
    score += 100 - index;
  }
  return score;
}
