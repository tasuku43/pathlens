# Storybook UI regression lab

Storybook is Vivi's lightweight review UI regression lab. It is meant to catch
review-surface regressions before full browser/server E2E tests run.

## Scope

Storybook stories cover stable browser UI states that can be represented with
domain-shaped fixtures:

- workbench-level review screens under `Screens/Workbench`
- comment thread lifecycle states under `Review/Comments`
- draft review tray and publish CTA states under `Review/Drafts`
- review queue summaries under `Review/Review Queue`
- diff, Markdown, and HTML review affordances under `Review/Diff` and `Viewers/*`
- navigation overlays under `Navigation/*`
- loading, error, disconnected, and activity states under `System/States`

The shared fixtures live in `ui/src/storybook/fixtures/review-lab.ts` and stay
close to the public domain and GraphQL contract: `ViviComment`,
`DraftReviewComment`, `PublishedReviewBatch`, `reviewBatchId`, diff anchors, and
comment thread activity events.

## Storybook vs E2E

Storybook should not emulate full filesystem, HTTP, GraphQL, SSE, or iframe
preview behavior. Those remain E2E responsibilities.

Use Storybook for:

- visual review of screen and component states
- checking comment, draft, batch, activity, and queue projections
- lightweight a11y checks on representative stories
- fast local inspection while changing UI layout or styling

Use E2E for:

- real server routing and `/preview/html` responses
- filesystem watcher behavior
- GraphQL mutation/subscription behavior
- CLI-readable comments watch behavior
- timing-sensitive integration flows

## Verification

Run the lightweight Storybook build with:

```bash
task storybook:build
```

The full repository gate still runs:

```bash
task check
```

Representative stories opt into `@storybook/addon-a11y` with
`parameters.a11y.test = "error"`. Broader interaction tests should be added as a
separate lightweight task if they become useful; they should not make `task
check` timing-sensitive.
