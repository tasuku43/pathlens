# pathlens

A live local viewer for Markdown, HTML, code, and assets.

`pathlens` is a CLI-launched local web app. It serves a selected directory, opens a browser-based SPA, renders a live file tree in the sidebar, and previews Markdown, HTML, source code, plain text, images, and structured files in the main pane.

## Why this exists

Opening an HTML file through `file://` solves only the single-file case. Static servers such as `python -m http.server` serve files but do not provide a live tree, Markdown rendering, source-code viewing, or a cohesive browser UI. Markdown previewers solve only one media type. `pathlens` is intended to be a local workspace lens: one UI for inspecting generated artifacts, documentation, examples, and code while files change underneath it.

## Core workflows

```bash
pathlens .
pathlens ./docs
pathlens ./dist --open
pathlens . --include md,html,ts,tsx,json,css,png,jpg
pathlens . --no-html-scripts
```

Expected user experience:

1. Run the CLI in or against a directory.
2. A local server starts on localhost.
3. The browser SPA shows a sidebar tree and main viewer.
4. Markdown renders as a polished document by default, with a source toggle.
5. HTML renders in a sandboxed iframe with local CSS and scripts enabled by default, with a source toggle and clear script status.
6. Code renders in a read-only inspection view with syntax highlighting, stable line numbers, line-range selection, copyable line references, and lightweight symbols in the inspector.
7. Text/log files use a readable monospace viewer with wrapping controls.
8. Images preview with fit-to-screen and actual-size modes.
9. JSON and structured text use safe formatted/readable code-style previews.
10. File changes update the currently open viewer without a full page reload and mark inactive tabs as changed.
11. File additions, deletions, and rename-like add/remove pairs update the sidebar tree dynamically.
12. Recent filesystem events appear in a compact review queue so changed files can be opened quickly.

## Run With Docker

Docker is the recommended way to run `pathlens` locally because it keeps the Node runtime isolated while mounting the directory you want to inspect as read-only.

```bash
docker run --rm -it \
  -p 4317:4317 \
  -v "$PWD:/workspace:ro" \
  ghcr.io/tasuku43/pathlens:latest
```

Then open:

```text
http://127.0.0.1:4317
```

The Docker image defaults to serving `/workspace` and binding `0.0.0.0` inside the container so the published port works from the host. The CLI default outside Docker remains `127.0.0.1`.

### Build The Docker Image Locally

Use Taskfile for local project tasks:

```bash
task docker:build
task docker:run
```

Stop the foreground Docker run with `Ctrl+C`. The container uses `tini` and the CLI handles `SIGINT`/`SIGTERM`, so the local watcher and HTTP server shut down cleanly.

Equivalent Docker commands:

```bash
docker build -t pathlens:local .
docker run --rm -it -p 4317:4317 -v "$PWD:/workspace:ro" pathlens:local
```

You can override the image tag, served directory, or host port:

```bash
task docker:build IMAGE=pathlens TAG=dev
task docker:run IMAGE=pathlens TAG=dev ROOT="$PWD/docs" PORT=4320
```

## Other Run Options

Use `npx` when you want to run the npm package without installing it globally:

```bash
npx pathlens . --open
```

Or install it as an npm package:

```bash
npm install -g pathlens
pathlens . --open
```

For source checkouts:

```bash
npm install
npm run build
node dist/cli/main.js . --open
```

## Release Images

The release workflow builds and pushes Docker images to GitHub Container Registry:

```text
ghcr.io/tasuku43/pathlens
```

Pushing a semver tag such as `v0.1.0` runs the release workflow and pushes both the version tag and `latest`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Manual workflow runs are available for validation builds. Provide a `release_tag` value matching `vMAJOR.MINOR.PATCH` only when intentionally publishing that tag; otherwise the workflow publishes a `sha-...` image tag.

## Current product status

This repository is an active implementation of the local read-only viewer. It includes the CLI/server boundary, live tree and SSE plumbing, multi-file tabs, viewer dispatch, a polished code inspection surface, contextual inspector, fixture-driven evals, and server/UI tests. It is still intentionally scoped as a local viewer rather than an editor, IDE, Git client, hosted service, or LLM product.

## Technical direction

TypeScript is the chosen implementation language because the product spans:

- a CLI entrypoint,
- a local HTTP/SSE server,
- a React SPA,
- shared filesystem event contracts,
- shared viewer type definitions, and
- test/eval fixtures.

Using one typed language keeps the API contract between server and client explicit.

## Development

Install [Task](https://taskfile.dev/) first if it is not already available.

```bash
npm install
task check
task build
```

Run the full local validation suite:

```bash
task check
```

The scaffold validator can run without installed dependencies:

```bash
node scripts/validate-scaffold.mjs
```

## Repository layout

```text
src/cli/       CLI parsing and process boundary
src/server/    local HTTP, preview, and event transport
src/app/       use cases and application contracts
src/domain/    pure filesystem tree model, path policy, and diff logic
src/infra/     Node filesystem and watcher adapters
src/ui/        React SPA, sidebar tree, and viewers
test/          unit, integration, and E2E tests
evals/         fixture-driven product evaluations
docs/          product, architecture, requirements, and agent context
```

## Product boundary

`pathlens` is a local read-only viewer, not an IDE, not a static-site generator, not a Git client, not a remote file browser, not an LLM product, and not a hosted documentation platform. It should remain fast to start, local-first, and safe by default.

## Viewer behavior

- Markdown: rendered document by default, source toggle, document typography, tables, code blocks, callouts, and H1/H2 outline in the inspector.
- HTML: sandboxed iframe preview by default, source toggle, local asset preview support, and visible script-mode status.
- Code and JSON: syntax-highlighted read-only code viewer with line numbers, line/range selection, copyable references, copyable selected code with path and line numbers, current-scope hinting, and inspector metadata.
- Text/log: monospaced read-only viewer with wrap/no-wrap toggle.
- Images: fit-to-screen and actual-size preview modes with size metadata.
- Large or unsupported files: safe fallback that explains why a richer preview is unavailable.

Recent filesystem events are shown as a compact review queue. Change events refresh the active file and mark inactive tabs/changed tree rows; add/remove events refresh the tree. Rename is currently represented by watcher add/remove semantics when the underlying platform reports it that way.

## Handing this repository to a coding agent

Instruct the agent to read `AGENTS.md`, `GOALS.md`, `docs/09-codex-runbook.md`, `docs/13-test-and-eval-strategy.md`, and `docs/14-architecture.md`. The agent should implement autonomously, drive behavior with tests and evals, run `task check`, and summarize product behavior, remaining gaps, and contract changes.

## UI mockups and product reference

Static HTML mockups are included under `docs/ui-mocks/` so coding agents can understand the intended product shape without relying on external context.

The preferred direction is:

```text
docs/ui-mocks/06-classic-reader-commandk.html
```

It combines a classic explorer sidebar, open-file tabs, a central viewer, a right Markdown outline/inspector, and a modal Cmd/Ctrl + K command palette.

Relevant docs:

- `docs/17-ui-product-decisions.md`
- `docs/18-ux-acceptance-criteria.md`
- `docs/ui-mocks/README.md`
