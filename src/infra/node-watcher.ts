import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { WatcherPort } from "../app/contracts.js";
import type { FsEvent, NodeKind } from "../domain/fs-node.js";
import {
  defaultIgnoredNames,
  isIgnoredPath,
  normalizeRelativePath,
} from "../domain/path-policy.js";

export interface NodeWatcherOptions {
  rootDir: string;
  ignoredNames?: Set<string>;
  debounceMs?: number;
  maxPendingEvents?: number;
  watchStartDelayMs?: number;
}

export interface NodeWatcherMetrics {
  knownPaths: number;
  pendingEvents: number;
  emittedEvents: number;
  droppedEvents: number;
  workerRunning: boolean;
}

export function eventFromKnownPath(
  relativePath: string,
  previous: NodeKind | undefined,
  current: NodeKind | null,
  version: number,
): FsEvent | null {
  if (!current) {
    return previous
      ? { type: "unlink", path: relativePath, kind: previous, version }
      : null;
  }
  if (!previous)
    return { type: "add", path: relativePath, kind: current, version };
  return { type: "change", path: relativePath, version };
}

export class NodeWatcher implements WatcherPort {
  private worker: Worker | null = null;
  private version = 1;
  private readonly rootDir: string;
  private readonly ignoredNames: Set<string>;
  private readonly debounceMs: number;
  private readonly maxPendingEvents: number;
  private readonly watchStartDelayMs: number;
  private readonly knownPaths = new Map<string, NodeKind>();
  private pending = new Map<string, NodeJS.Timeout>();
  private emittedEvents = 0;
  private droppedEvents = 0;

  constructor(options: string | NodeWatcherOptions) {
    if (typeof options === "string") {
      this.rootDir = path.resolve(options);
      this.ignoredNames = defaultIgnoredNames;
      this.debounceMs = 50;
      this.maxPendingEvents = 2_000;
      this.watchStartDelayMs = 2_000;
    } else {
      this.rootDir = path.resolve(options.rootDir);
      this.ignoredNames = options.ignoredNames ?? defaultIgnoredNames;
      this.debounceMs = options.debounceMs ?? 50;
      this.maxPendingEvents = options.maxPendingEvents ?? 2_000;
      this.watchStartDelayMs = options.watchStartDelayMs ?? 2_000;
    }
  }

  async start(onEvent: (event: FsEvent) => void): Promise<void> {
    this.knownPaths.clear();
    this.worker = new Worker(watcherWorkerSource(), {
      eval: true,
      workerData: {
        rootDir: this.rootDir,
        ignoredNames: [...this.ignoredNames],
        watchStartDelayMs: this.watchStartDelayMs,
      },
    });
    this.worker.on("message", (message: unknown) => {
      if (!isWatcherMessage(message)) return;
      this.queueEvent(message.path, onEvent);
    });
    this.worker.on("error", () => {
      this.worker = null;
    });
    this.worker.on("exit", () => {
      this.worker = null;
    });
  }

  async stop(): Promise<void> {
    for (const timer of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
    const worker = this.worker;
    this.worker = null;
    await worker?.terminate();
  }

  getMetrics(): NodeWatcherMetrics {
    return {
      knownPaths: this.knownPaths.size,
      pendingEvents: this.pending.size,
      emittedEvents: this.emittedEvents,
      droppedEvents: this.droppedEvents,
      workerRunning: Boolean(this.worker),
    };
  }

  private queueEvent(
    relativePath: string,
    onEvent: (event: FsEvent) => void,
  ): void {
    const existing = this.pending.get(relativePath);
    if (existing) clearTimeout(existing);
    else if (this.pending.size >= this.maxPendingEvents) {
      this.droppedEvents += 1;
      return;
    }
    const timer = setTimeout(() => {
      this.pending.delete(relativePath);
      void this.emitCurrentState(relativePath, onEvent);
    }, this.debounceMs);
    this.pending.set(relativePath, timer);
  }

  private async emitCurrentState(
    relativePath: string,
    onEvent: (event: FsEvent) => void,
  ): Promise<void> {
    const previous = this.knownPaths.get(relativePath);
    const kind = await this.kindFor(relativePath);

    if (!kind) {
      if (previous) {
        this.knownPaths.delete(relativePath);
        const event = eventFromKnownPath(
          relativePath,
          previous,
          null,
          ++this.version,
        );
        if (event) {
          this.emittedEvents += 1;
          onEvent(event);
        }
      }
      return;
    }

    this.knownPaths.set(relativePath, kind);
    const event = eventFromKnownPath(
      relativePath,
      previous,
      kind,
      ++this.version,
    );
    if (event) {
      this.emittedEvents += 1;
      onEvent(event);
    }
  }

  private async kindFor(relativePath: string): Promise<NodeKind | null> {
    try {
      const stat = await fsPromises.stat(path.join(this.rootDir, relativePath));
      if (stat.isDirectory()) return "directory";
      if (stat.isFile()) return "file";
      return null;
    } catch {
      return null;
    }
  }
}

function isWatcherMessage(message: unknown): message is { path: string } {
  return (
    typeof message === "object" &&
    message !== null &&
    typeof (message as { path?: unknown }).path === "string"
  );
}

function watcherWorkerSource(): string {
  return `
const { watch } = require("node:fs");
const path = require("node:path");
const { parentPort, workerData } = require("node:worker_threads");

const ignoredNames = new Set(workerData.ignoredNames ?? []);
let watcher = null;
let startTimer = setTimeout(() => {
  startTimer = null;
  try {
    watcher = watch(workerData.rootDir, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      const normalized = normalizeRelativePath(String(filename).split(path.sep).join("/"));
      if (!normalized.ok || !normalized.relativePath) return;
      if (isIgnoredPath(normalized.relativePath, ignoredNames)) return;
      parentPort?.postMessage({ path: normalized.relativePath });
    });
  } catch {
    parentPort?.postMessage({ unavailable: true });
  }
}, workerData.watchStartDelayMs ?? 0);

parentPort?.on("message", (message) => {
  if (message !== "stop") return;
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  watcher?.close();
  watcher = null;
});

function normalizeRelativePath(input) {
  const raw = input.trim().replace(/\\\\/g, "/");
  if (raw.includes("\\0")) return { ok: false, reason: "path contains invalid characters" };
  if (raw === "" || raw === ".") return { ok: true, relativePath: "" };
  if (raw.startsWith("/")) return { ok: false, reason: "absolute paths are not allowed" };
  const segments = [];
  for (const segment of raw.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return { ok: false, reason: "path escapes root" };
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return { ok: true, relativePath: segments.join("/") };
}

function isIgnoredPath(relativePath, ignoredNames) {
  return relativePath.split("/").some((segment) => ignoredNames.has(segment));
}
`;
}
