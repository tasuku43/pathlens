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
```

Expected user experience:

1. Run the CLI in or against a directory.
2. A local server starts on localhost.
3. The browser SPA shows a sidebar tree and main viewer.
4. Markdown renders as HTML.
5. HTML renders in a sandboxed iframe.
6. Code renders with syntax highlighting.
7. File changes update the currently open viewer without a full page reload.
8. File additions, deletions, and renames update the sidebar tree dynamically.

## Current scaffold status

This repository is an implementation scaffold, not a completed product. It contains the intended architecture, contracts, starter code, fixtures, tests, eval harness, documentation, and CI shape so an autonomous coding agent can implement against clear acceptance criteria.

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

```bash
npm install
npm run dev:server
npm run dev
```

Run the full local validation suite:

```bash
make check
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

`pathlens` is a local viewer, not an IDE, not a static-site generator, not a remote file browser, and not a hosted documentation platform. It should remain fast to start, local-first, and safe by default.

## Handing this repository to a coding agent

Instruct the agent to read `AGENTS.md`, `GOALS.md`, `docs/09-codex-runbook.md`, `docs/13-test-and-eval-strategy.md`, and `docs/14-architecture.md`. The agent should implement autonomously, drive behavior with tests and evals, run `make check`, and summarize product behavior, remaining gaps, and contract changes.

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
