import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readOtelSpans, summarizeOperationSpans } from "../scripts/perf-otel-summary.mjs";

describe("perf OpenTelemetry summary", () => {
  it("groups Vivi operation spans and calculates scan totals", () => {
    const spans = [
      span("server.watch_loop", {
        duration_ms: { intValue: "10" },
        scanned_directories: { intValue: "2" },
        scanned_files: { intValue: "5" },
        emitted_events: { intValue: "0" },
        result_count: { intValue: "7" },
        cpu_total_ms: { intValue: "3" },
        cpu_percent: { doubleValue: 30 },
        memory_heap_alloc_bytes: { intValue: "5000000" },
        memory_heap_alloc_delta_bytes: { intValue: "12000" },
        memory_rss_max_bytes: { intValue: "8000000" },
        memory_total_alloc_delta_bytes: { intValue: "16000" },
        goroutines: { intValue: "8" },
        cached: { boolValue: false },
        error: { boolValue: false },
      }),
      span("server.watch_loop", {
        duration_ms: { intValue: "14" },
        scanned_directories: { intValue: "3" },
        scanned_files: { intValue: "8" },
        emitted_events: { intValue: "1" },
        result_count: { intValue: "11" },
        cpu_total_ms: { intValue: "5" },
        cpu_percent: { doubleValue: 35 },
        memory_heap_alloc_bytes: { intValue: "5010000" },
        memory_heap_alloc_delta_bytes: { intValue: "-4000" },
        memory_rss_max_bytes: { intValue: "8100000" },
        memory_total_alloc_delta_bytes: { intValue: "6000" },
        goroutines: { intValue: "9" },
        cached: { boolValue: true },
        error: { boolValue: false },
      }),
    ];

    const summary = summarizeOperationSpans(spans, 2000);

    expect(summary.operations["server.watch_loop"]).toMatchObject({
      count: 2,
      frequencyPerSecond: 1,
      durationMs: { min: 10, max: 14, sum: 24, avg: 12 },
      scannedFiles: { sum: 13 },
      emittedEvents: { sum: 1 },
      cpuTotalMs: { min: 3, max: 5, sum: 8, avg: 4 },
      cpuPercent: { min: 30, max: 35, sum: 65, avg: 32.5 },
      memoryHeapAllocDeltaBytes: { min: -4000, max: 12000, sum: 8000, avg: 4000 },
      memoryTotalAllocDeltaBytes: { sum: 22000 },
      goroutines: { max: 9 },
      cached: 1,
    });
  });

  it("skips collector file padding before JSON records", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vivi-otel-"));
    const file = path.join(dir, "otel.jsonl");
    try {
      writeFileSync(
        file,
        `\0\0\0\n${JSON.stringify({
          resourceSpans: [{ scopeSpans: [{ spans: [span("workspace.read_tree", {})] }] }],
        })}\n`,
        "utf8",
      );

      expect(readOtelSpans(file)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function span(operation: string, attributes: Record<string, Record<string, unknown>>) {
  return {
    attributes: [
      { key: "vivi.operation", value: { stringValue: operation } },
      ...Object.entries(attributes).map(([key, value]) => ({ key, value })),
    ],
  };
}
