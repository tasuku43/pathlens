import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "../../../state/git-review.js";
import {
  buildRenderedChangeCards,
  buildRenderedDiffRows,
  renderedChangeCardCommentDraft,
} from "./DiffViewer.js";

describe("buildRenderedChangeCards", () => {
  it("groups adjacent removed and added rendered blocks into changed cards", () => {
    const diff = [
      "diff --git a/docs/review.md b/docs/review.md",
      "--- a/docs/review.md",
      "+++ b/docs/review.md",
      "@@ -1,4 +1,5 @@",
      " # Review",
      "-Old paragraph.",
      "+New paragraph.",
      " Existing paragraph.",
      "+Added paragraph.",
      " Another existing paragraph.",
      "-Removed paragraph.",
    ].join("\n");

    const rows = buildRenderedDiffRows(parseUnifiedDiff(diff), "markdown");
    const cards = buildRenderedChangeCards(rows);

    expect(cards.map((card) => card.kind)).toEqual([
      "changed",
      "added",
      "removed",
    ]);
    expect(cards[0]).toMatchObject({
      before: { source: "Old paragraph." },
      after: { source: "New paragraph." },
    });
    expect(cards[0]?.sourceRows).toHaveLength(2);
  });

  it("splits mixed fenced code changes into before and after cards", () => {
    const diff = [
      "diff --git a/docs/review.md b/docs/review.md",
      "--- a/docs/review.md",
      "+++ b/docs/review.md",
      "@@ -1,5 +1,5 @@",
      " ```ts",
      " const unchanged = true;",
      "-console.log('old');",
      "+console.log('new');",
      " ```",
    ].join("\n");

    const rows = buildRenderedDiffRows(parseUnifiedDiff(diff), "markdown");
    const cards = buildRenderedChangeCards(rows);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: "changed",
      before: {
        source: "```ts\nconst unchanged = true;\nconsole.log('old');\n```",
      },
      after: {
        source: "```ts\nconst unchanged = true;\nconsole.log('new');\n```",
      },
    });
    expect(cards[0]?.before?.source).not.toContain("console.log('new')");
    expect(cards[0]?.after?.source).not.toContain("console.log('old')");
  });

  it("builds new-side comment drafts for added rendered cards", () => {
    const diff = {
      path: "docs/review.md",
      status: "available" as const,
      baseLabel: "HEAD",
      compareLabel: "working tree",
      diffHash: "sha256:diff",
      content: [
        "diff --git a/docs/review.md b/docs/review.md",
        "--- a/docs/review.md",
        "+++ b/docs/review.md",
        "@@ -1,1 +1,2 @@",
        " # Review",
        "+Added paragraph.",
      ].join("\n"),
    };
    const cards = buildRenderedChangeCards(
      buildRenderedDiffRows(parseUnifiedDiff(diff.content), "markdown"),
    );
    const draft = renderedChangeCardCommentDraft(
      {
        path: "docs/review.md",
        viewerKind: "markdown",
        encoding: "utf8",
        content: "# Review\nAdded paragraph.",
        etag: "etag-current",
        size: 27,
        mtimeMs: 1,
      },
      diff,
      cards[0]!,
    );

    expect(draft?.anchor.diff).toMatchObject({
      path: "docs/review.md",
      hunkId: "@@ -1,1 +1,2 @@",
      side: "new",
      newLineStart: 2,
      newLineEnd: 2,
      diffHash: "sha256:diff",
      changeKind: "added",
    });
    expect(draft?.anchor.canonical.quote).toBe("Added paragraph.");
  });

  it("builds old-side comment drafts for removed rendered cards", () => {
    const diff = {
      path: "docs/review.md",
      status: "available" as const,
      baseLabel: "HEAD",
      baseRef: "refs/heads/main",
      compareLabel: "working tree",
      diffHash: "sha256:diff",
      content: [
        "diff --git a/docs/review.md b/docs/review.md",
        "--- a/docs/review.md",
        "+++ b/docs/review.md",
        "@@ -2,1 +1,0 @@",
        "-Removed paragraph.",
      ].join("\n"),
    };
    const cards = buildRenderedChangeCards(
      buildRenderedDiffRows(parseUnifiedDiff(diff.content), "markdown"),
    );
    const draft = renderedChangeCardCommentDraft(
      {
        path: "docs/review.md",
        viewerKind: "markdown",
        encoding: "utf8",
        content: "# Review",
        etag: "etag-current",
        size: 8,
        mtimeMs: 1,
      },
      diff,
      cards[0]!,
    );

    expect(draft?.anchor.diff).toMatchObject({
      path: "docs/review.md",
      base: "refs/heads/main",
      hunkId: "@@ -2,1 +1,0 @@",
      side: "old",
      oldLineStart: 2,
      oldLineEnd: 2,
      diffHash: "sha256:diff",
    });
    expect(draft?.anchor.canonical.quote).toBe("Removed paragraph.");
  });
});
