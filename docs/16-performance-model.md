# Performance model

## Recommended strategy

Use watcher events as the primary signal. Use hashes and versions as validation data, not as the main detection mechanism.

## Avoid

- Full recursive content hashing on every save.
- Rendering every node in huge trees.
- Watchers per React component.
- Replacing all UI state on every event.

## MVP acceptable behavior

- Refetch the currently open file when it changes.
- Refetch the tree on add/remove events.
- Back off recursive polling after repeated empty watch scans, while resetting to
  the normal interval as soon as a filesystem event is emitted.
- Preserve selected and expanded state in the UI.
- Bound initial sidebar expansion so large trees do not mount every descendant on first render.
- Cap rendered visible sidebar rows after large folders are expanded, while keeping selected and changed paths plus their ancestors rendered.
- Keep ancestors of selected and changed files expanded so review targets remain reachable even when the rest of a large tree is collapsed or omitted from the current render window.
- For oversized text-like files, read only a bounded leading chunk and label it as a partial preview instead of loading the whole file.

## Optional performance instrumentation

Normal Vivi builds do not initialize telemetry:

```bash
npm run build:go
```

To profile large workspace CPU paths, build the opt-in binary with the `otel`
Go build tag:

```bash
npm run build:go:otel
```

The tagged binary instruments coarse operations only:

- server watch loop,
- workspace `WatchEntries`,
- Git review status refresh,
- file search,
- content search.

Each operation emits a trace span with low-cardinality attributes:
`duration_ms`, `scanned_directories`, `scanned_files`, `read_files`,
`emitted_events`, `result_count`, and `error`. When the `otel` build is active
and export is enabled, the same span also includes process resource deltas:
`cpu_user_ms`, `cpu_system_ms`, `cpu_total_ms`, `cpu_percent`,
`memory_heap_alloc_bytes`, `memory_heap_alloc_delta_bytes`,
`memory_rss_max_bytes`, `memory_rss_max_delta_bytes`,
`memory_total_alloc_delta_bytes`, `memory_mallocs_delta`,
`memory_frees_delta`, `memory_num_gc`, and `goroutines`.

`cpu_percent` is process CPU time divided by wall time, so 100 is roughly one
fully used logical core during that operation and values above 100 mean the
process used more than one core. `memory_rss_max_bytes` comes from process
resource usage and is a high-water mark, not a current RSS gauge.

Normal builds do not sample CPU or memory. `StartOperation` is a no-op unless
the `otel` build has initialized export, so the default CLI/server hot paths do
not pay `runtime.ReadMemStats` or `getrusage` costs.

Spans do not include raw file paths, query text, or user-specific absolute
workspace paths.

### Local Collector

Start the local OpenTelemetry Collector with:

```bash
mkdir -p artifacts/perf
docker compose -f docker-compose.otel.yml up
```

The collector receives OTLP on standard ports inside the container and maps
them to host ports `24317` (gRPC) and `24318` (HTTP) to avoid collisions with
local Vivi/dev-server ports. It writes protobuf JSON records to:

```text
artifacts/perf/otel.jsonl
```

No Grafana, UI, or remote backend is part of the perf setup. If `vivi-otel`
starts while the collector is unavailable, it prints a warning and continues
without exporting telemetry.

### Perf Harness

Run the harness with:

```bash
npm run perf:otel
```

By default it creates a disposable synthetic workspace under
`artifacts/perf/synthetic-workspace`, starts `vivi-otel`, and measures idle
watching, one file-change probe, Git review refresh, filename search, and
content search as separate scenarios. It also launches a headless browser for a
front-end workspace smoke path, samples the server process RSS/CPU with `ps`,
runs the review CLI repeatedly against the local server, and can apply a burst
of temporary workspace changes. It writes:

```text
artifacts/perf/summary.json
artifacts/perf/otel.jsonl
```

Use these environment variables for larger or existing disposable workspaces:

```bash
VIVI_PERF_DIRS=80 VIVI_PERF_FILES_PER_DIR=80 npm run perf:otel
VIVI_PERF_WORKSPACE=/path/to/disposable-workspace npm run perf:otel
```

When `VIVI_PERF_WORKSPACE` is set, the harness does not initialize Git or add
review fixtures. The file-change scenario creates one temporary root-level
probe file and removes it before exiting, so real repositories can be measured
without leaving perf files behind.

Useful knobs:

```bash
VIVI_PERF_CLI_ITERATIONS=10 npm run perf:otel
VIVI_PERF_BURST_CHANGES=100 VIVI_PERF_BURST_DELAY_MS=10 npm run perf:otel
VIVI_PERF_SKIP_BUILD=1 npm run perf:otel
```

Use `VIVI_PERF_RUN_NAME=<name>` to keep a named copy of the summary at:

```text
artifacts/perf/<name>.summary.json
```

### Reading Results

Codex should start with `artifacts/perf/summary.json` because it is stable and
compact. Compare `operations.*.stats.durationMs`, scan counts, result counts,
and `artifacts.otelJsonlRecords` across runs.

Use `artifacts/perf/otel.jsonl` for lower-level span inspection. Each line is a
collector-exported OTLP JSON batch; search for `vivi.operation` values such as
`workspace.content_search` or `server.watch_loop`, then compare the numeric
attributes listed above.

### Baseline: linux workspace on 2026-06-27

Baseline command:

```bash
docker compose -f docker-compose.otel.yml up -d
VIVI_PERF_RUN_NAME=linux-baseline-2026-06-27 \
  VIVI_PERF_WORKSPACE=/Users/tasuku/work/github.com/torvalds/linux \
  VIVI_PERF_IDLE_MS=3500 \
  VIVI_PERF_BURST_CHANGES=30 \
  VIVI_PERF_BURST_DELAY_MS=20 \
  VIVI_PERF_CLI_ITERATIONS=5 \
  npm run perf:otel
```

Artifacts:

- `artifacts/perf/linux-baseline-2026-06-27.summary.json`
- `artifacts/perf/summary.json`
- `artifacts/perf/otel.jsonl`

Workspace shape: `/Users/tasuku/work/github.com/torvalds/linux`, 6,142
directories and 93,609 files counted by the harness, with Git available. The
full run took 35.8s and reported no scenario errors.

Front-end baseline:

| Scenario | User path | JS heap used | JS heap total | Script | Layout | Task | DOM nodes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `front_workspace` after load | `Makefile` | 40.2 MB | 90.5 MB | 583 ms | 57 ms | 694 ms | 14,744 |
| `front_workspace` after Cmd/Ctrl+K open/close | `Makefile` | 45.3 MB | 102.8 MB | 966 ms | 57 ms | 1,090 ms | 14,802 |

CLI baseline:

| Scenario | Iterations | Total wall time | Exit codes | CLI max RSS | CLI avg CPU sample | CLI CPU time |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| `cli_review_queue` | 5 | 1,703 ms | `0: 5` | 16.7 MB | 1.9% | 10 ms avg |

Server process baseline:

| Scenario | Max RSS | Max sampled CPU | Server CPU time delta |
| --- | ---: | ---: | ---: |
| `idle_watch` | 75.6 MB | 112.4% | 3,040 ms |
| `front_workspace` | 39.7 MB | 76.7% | 1,260 ms |
| `cli_review_queue` | 49.5 MB | 101.5% | 1,680 ms |
| `git_review` | 28.0 MB | 61.2% | 330 ms |
| `file_search` | 105.0 MB | 212.9% | 3,680 ms |
| `content_search` | 72.7 MB | 225.9% | 6,080 ms |
| `file_change` | 76.2 MB | 114.1% | 3,580 ms |
| `change_burst` | 76.8 MB | 112.7% | 3,610 ms |

Operation baseline from OTel spans:

| Scenario | Operation | Count | Avg duration | Max duration | Avg CPU time | Avg CPU% | Avg heap delta | Avg total alloc | Max RSS | Avg scanned files | Avg read files | Events |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `idle_watch` | `workspace.watch_entries` | 2 | 1,361.5 ms | 1,420 ms | 1,528.5 ms | 112.4% | 16.2 MB | 470.3 MB | 75.6 MB | 93,696 | 0 | 0 |
| `idle_watch` | `server.watch_loop` | 1 | 1,324 ms | 1,324 ms | 1,526 ms | 115.3% | 7.2 MB | 470.3 MB | 75.6 MB | 93,696 | 0 | 0 |
| `git_review` | `git.review_status_refresh` | 1 | 304 ms | 304 ms | 294 ms | 96.7% | 1.7 MB | 75.3 MB | 27.8 MB | 0 | 0 | 0 |
| `file_search` | `workspace.file_search` | 3 | 598.7 ms | 1,769 ms | 1,248.3 ms | 138.8% | 18.3 MB | 330.3 MB | 105.0 MB | 31,232 | 0 | 0 |
| `content_search` | `workspace.content_search` | 3 | 1,133.7 ms | 2,045 ms | 2,068.3 ms | 195.8% | 9.0 MB | 613.3 MB | 72.7 MB | 19,316 | 10,187 | 0 |
| `file_change` | `server.watch_loop` | 2 | 1,336 ms | 1,336 ms | 1,528 ms | 114.4% | 15.3 MB | 470.5 MB | 79.6 MB | 93,696.5 | 0 | 2 |
| `change_burst` | `server.watch_loop` | 2 | 1,517.5 ms | 1,694 ms | 1,599.5 ms | 106.3% | 11.4 MB | 470.6 MB | 79.4 MB | 93,726 | 0 | 31 |

Watcher event latency:

| Scenario | Changes | Observed | First event | Last event |
| --- | ---: | ---: | ---: | ---: |
| `file_change` | 1 | 1 | 3,545 ms | 3,545 ms |
| `change_burst` | 30 | 30 | 3,505 ms | 3,513 ms |

Baseline interpretation:

- Large linux watch scans are the dominant background cost: each scan visits
  about 93.7k files, allocates about 470 MB total, and takes 1.3-1.7s.
- Filename search is cheap after the first query because the in-process file
  index is cached; the first query still performs a full tree walk.
- Content search is CPU-bound and allocation-heavy because it reads thousands
  of text-like files per query.
- The current polling watcher explains the 3.5s observed event latency under
  linux-scale trees. The latency is bounded by scan duration plus backoff timing,
  not by SSE delivery after the scan completes.

### Production-readiness performance targets

These targets define the line Vivi should reach before it is considered
comfortable for daily use on a large local repository such as linux-scale source
trees. They are intentionally framed around user-perceived behavior and resource
ceilings, not only implementation internals.

Large workspace target shape:

- 100k tracked workspace files, 6k-10k directories, Git repository present.
- Default ignores active for `.git`, `node_modules`, and common build caches.
- No telemetry overhead in normal builds; perf builds may pay sampling overhead.

MVP readiness targets:

| Area | Target |
| --- | --- |
| Initial UI usability | First bounded tree and shell visible within 2s on a warm machine. |
| Idle server cost | After startup reconciliation, steady idle CPU stays under 5% average and does not perform full recursive scans repeatedly. |
| Watch event latency | File add/change/unlink event p95 under 500 ms and p99 under 1s for ordinary edits. |
| Watch burst handling | 100 file changes observed without dropped events; first event under 500 ms, final event under 1.5s. |
| Server memory | Steady RSS under 150 MB while browsing and watching a linux-scale tree. |
| Front-end memory | JS heap used under 80 MB after opening a typical source/Markdown file; under 120 MB after command palette and tab interactions. |
| Filename search | Warm filename search p95 under 100 ms; cold index build under 1.5s and not repeated after every small edit. |
| Content search | First 20 results under 1.5s for common code tokens, with bounded total allocation under 250 MB per query. |
| Git review refresh | `reviewQueue` p95 under 750 ms and no repeated timeout churn in the browser. |
| CLI review path | `vivi review queue --json` p95 under 500 ms when the server is already running; CLI RSS under 25 MB. |

Stretch targets:

- Watch event p95 under 200 ms for ordinary edits.
- Warm filename search p95 under 50 ms.
- Content search streams or incrementally returns first results under 500 ms.
- Front-end JS heap remains under 100 MB after opening 10 files in tabs.

The next performance slice should prioritize replacing recurring recursive
polling with platform watcher events plus explicit reconciliation scans. That
single change is expected to move the largest gaps at once: idle CPU, event
latency, burst latency, and repeated scan allocation.

## Future behavior

- Normalize tree state by path.
- Apply semantic tree events.
- Replace the bounded visible-row cap with smooth virtualization for very large trees.
- Add range controls for large-file partial loading when users need a later chunk.
- Add text diff patching only where profiling shows it matters.
- Replace recursive polling with platform watcher events for large trees, using
  full scans only for startup and reconciliation.
