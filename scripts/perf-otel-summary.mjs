import { existsSync, readFileSync } from "node:fs";

export function readOtelSpans(file) {
  if (!existsSync(file)) return [];
  const spans = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const normalized = line.replace(/\0/g, "").trim();
    if (normalized === "" || !normalized.startsWith("{")) continue;
    const record = JSON.parse(normalized);
    for (const span of spansFromRecord(record)) {
      spans.push(span);
    }
  }
  return spans;
}

export function summarizeOperationSpans(spans, durationMs) {
  const groups = {};
  for (const span of spans) {
    const attributes = attributesMap(span.attributes ?? []);
    const operation = attributes["vivi.operation"];
    if (!operation) continue;
    const group = groups[operation] ?? {
      count: 0,
      frequencyPerSecond: 0,
      durationMs: statsBucket(),
      scannedDirectories: statsBucket(),
      scannedFiles: statsBucket(),
      readFiles: statsBucket(),
      emittedEvents: statsBucket(),
      resultCount: statsBucket(),
      cpuUserMs: statsBucket(),
      cpuSystemMs: statsBucket(),
      cpuTotalMs: statsBucket(),
      cpuPercent: statsBucket(),
      memoryHeapAllocBytes: statsBucket(),
      memoryHeapAllocDeltaBytes: statsBucket(),
      memoryRssMaxBytes: statsBucket(),
      memoryRssMaxDeltaBytes: statsBucket(),
      memoryTotalAllocDeltaBytes: statsBucket(),
      memoryMallocsDelta: statsBucket(),
      memoryFreesDelta: statsBucket(),
      memoryNumGc: statsBucket(),
      goroutines: statsBucket(),
      cached: 0,
      errors: 0,
    };
    group.count++;
    group.durationMs = addStat(group.durationMs, numberValue(attributes.duration_ms));
    group.scannedDirectories = addStat(group.scannedDirectories, numberValue(attributes.scanned_directories));
    group.scannedFiles = addStat(group.scannedFiles, numberValue(attributes.scanned_files));
    group.readFiles = addStat(group.readFiles, numberValue(attributes.read_files));
    group.emittedEvents = addStat(group.emittedEvents, numberValue(attributes.emitted_events));
    group.resultCount = addStat(group.resultCount, numberValue(attributes.result_count));
    group.cpuUserMs = addStat(group.cpuUserMs, numberValue(attributes.cpu_user_ms));
    group.cpuSystemMs = addStat(group.cpuSystemMs, numberValue(attributes.cpu_system_ms));
    group.cpuTotalMs = addStat(group.cpuTotalMs, numberValue(attributes.cpu_total_ms));
    group.cpuPercent = addStat(group.cpuPercent, numberValue(attributes.cpu_percent));
    group.memoryHeapAllocBytes = addStat(group.memoryHeapAllocBytes, numberValue(attributes.memory_heap_alloc_bytes));
    group.memoryHeapAllocDeltaBytes = addStat(group.memoryHeapAllocDeltaBytes, numberValue(attributes.memory_heap_alloc_delta_bytes));
    group.memoryRssMaxBytes = addStat(group.memoryRssMaxBytes, numberValue(attributes.memory_rss_max_bytes));
    group.memoryRssMaxDeltaBytes = addStat(group.memoryRssMaxDeltaBytes, numberValue(attributes.memory_rss_max_delta_bytes));
    group.memoryTotalAllocDeltaBytes = addStat(group.memoryTotalAllocDeltaBytes, numberValue(attributes.memory_total_alloc_delta_bytes));
    group.memoryMallocsDelta = addStat(group.memoryMallocsDelta, numberValue(attributes.memory_mallocs_delta));
    group.memoryFreesDelta = addStat(group.memoryFreesDelta, numberValue(attributes.memory_frees_delta));
    group.memoryNumGc = addStat(group.memoryNumGc, numberValue(attributes.memory_num_gc));
    group.goroutines = addStat(group.goroutines, numberValue(attributes.goroutines));
    if (attributes.cached === true) {
      group.cached++;
    }
    if (attributes.error === true) {
      group.errors++;
    }
    groups[operation] = group;
  }
  for (const group of Object.values(groups)) {
    group.frequencyPerSecond = durationMs > 0 ? round(group.count / (durationMs / 1000), 3) : 0;
    for (const key of [
      "durationMs",
      "scannedDirectories",
      "scannedFiles",
      "readFiles",
      "emittedEvents",
      "resultCount",
      "cpuUserMs",
      "cpuSystemMs",
      "cpuTotalMs",
      "cpuPercent",
      "memoryHeapAllocBytes",
      "memoryHeapAllocDeltaBytes",
      "memoryRssMaxBytes",
      "memoryRssMaxDeltaBytes",
      "memoryTotalAllocDeltaBytes",
      "memoryMallocsDelta",
      "memoryFreesDelta",
      "memoryNumGc",
      "goroutines",
    ]) {
      group[key] = finalizeStat(group[key]);
    }
  }
  return {
    spanCount: spans.length,
    operations: groups,
  };
}

function spansFromRecord(record) {
  const spans = [];
  for (const resourceSpan of record.resourceSpans ?? []) {
    for (const scopeSpan of resourceSpan.scopeSpans ?? resourceSpan.instrumentationLibrarySpans ?? []) {
      for (const span of scopeSpan.spans ?? []) {
        spans.push(span);
      }
    }
  }
  return spans;
}

function attributesMap(attributes) {
  const result = {};
  for (const attribute of attributes) {
    result[attribute.key] = attributeValue(attribute.value ?? {});
  }
  return result;
}

function attributeValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("intValue" in value) return Number(value.intValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("boolValue" in value) return Boolean(value.boolValue);
  return undefined;
}

function statsBucket() {
  return { count: 0, min: null, max: null, sum: 0 };
}

function addStat(bucket, value) {
  if (!Number.isFinite(value)) return bucket;
  bucket.count++;
  bucket.min = bucket.min === null ? value : Math.min(bucket.min, value);
  bucket.max = bucket.max === null ? value : Math.max(bucket.max, value);
  bucket.sum += value;
  return bucket;
}

function finalizeStat(bucket) {
  return {
    count: bucket.count,
    min: bucket.min,
    max: bucket.max,
    sum: bucket.sum,
    avg: bucket.count > 0 ? round(bucket.sum / bucket.count, 3) : null,
  };
}

function numberValue(value) {
  return typeof value === "number" ? value : Number(value);
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
