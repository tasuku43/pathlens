import { afterEach, expect, it, vi } from "vitest";
import { eventFromKnownPath, NodeWatcher } from "../../src/infra/node-watcher.js";

afterEach(() => {
  vi.useRealTimers();
});

it("classifies watcher state transitions into semantic events", () => {
  expect(eventFromKnownPath("new.md", undefined, "file", 2)).toEqual({
    type: "add",
    path: "new.md",
    kind: "file",
    version: 2,
  });
  expect(eventFromKnownPath("README.md", "file", "file", 3)).toEqual({
    type: "change",
    path: "README.md",
    version: 3,
  });
  expect(eventFromKnownPath("old.md", "file", null, 4)).toEqual({
    type: "unlink",
    path: "old.md",
    kind: "file",
    version: 4,
  });
  expect(eventFromKnownPath("missing.md", undefined, null, 5)).toBeNull();
});

it("bounds pending watcher events during event storms", async () => {
  vi.useFakeTimers();
  const watcher = new NodeWatcher({
    rootDir: ".",
    debounceMs: 1_000,
    maxPendingEvents: 2,
  }) as unknown as {
    queueEvent(path: string, onEvent: () => void): void;
    stop(): Promise<void>;
    getMetrics(): {
      pendingEvents: number;
      droppedEvents: number;
      emittedEvents: number;
    };
  };

  watcher.queueEvent("a.md", () => {});
  watcher.queueEvent("b.md", () => {});
  watcher.queueEvent("c.md", () => {});

  expect(watcher.getMetrics()).toMatchObject({
    pendingEvents: 2,
    droppedEvents: 1,
    emittedEvents: 0,
  });
  await watcher.stop();
});
