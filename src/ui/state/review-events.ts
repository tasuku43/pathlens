import type { FsEvent } from "../../domain/fs-node.js";

export interface ReviewEvent {
  id: string;
  event: FsEvent;
  receivedAt: number;
}

export interface FileReviewState {
  changedPaths: Set<string>;
  removedPaths: Set<string>;
  latestByPath: Map<string, ReviewEvent>;
}

export function recordReviewEvent(
  events: ReviewEvent[],
  event: FsEvent,
  now = Date.now(),
  limit = 40,
): ReviewEvent[] {
  const next: ReviewEvent = {
    id: `${event.version}:${event.type}:${event.path}:${now}`,
    event,
    receivedAt: now,
  };
  return [next, ...events].slice(0, limit);
}

export function summarizeReviewEvents(events: ReviewEvent[]): FileReviewState {
  const changedPaths = new Set<string>();
  const removedPaths = new Set<string>();
  const latestByPath = new Map<string, ReviewEvent>();

  for (const item of events) {
    if (!latestByPath.has(item.event.path))
      latestByPath.set(item.event.path, item);
    if (item.event.type === "unlink") {
      removedPaths.add(item.event.path);
      changedPaths.delete(item.event.path);
      continue;
    }
    if (item.event.type === "add" && item.event.kind === "directory") continue;
    changedPaths.add(item.event.path);
    removedPaths.delete(item.event.path);
  }

  return { changedPaths, removedPaths, latestByPath };
}

export function eventLabel(event: FsEvent): string {
  if (event.type === "add")
    return event.kind === "directory" ? "Added dir" : "Added";
  if (event.type === "unlink")
    return event.kind === "directory" ? "Removed dir" : "Removed";
  return "Changed";
}
