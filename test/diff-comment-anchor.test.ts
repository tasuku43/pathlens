import { describe, expect, it } from "vitest";
import { normalizeCommentCreateInput } from "../ui/src/domain/comments.js";
import { diffCommentDraft } from "../ui/src/state/comments.js";

const file = { path: "src/a.ts", viewerKind: "code" as const, encoding: "utf8" as const, content: "next\n", etag: "file-hash", size: 5, mtimeMs: 1 };

describe("stable diff comment anchors", () => {
  it("captures revision, hunk, side, line range, and hashes", () => {
    const draft = diffCommentDraft(file, 7, 9, "added", "next", { base: "abc123", ref: "working tree", hunkId: "@@ -5,2 +7,3 @@", diffHash: "sha256:diff" });
    expect(draft.anchor.diff).toEqual({ path: "src/a.ts", base: "abc123", ref: "working tree", hunkId: "@@ -5,2 +7,3 @@", side: "new", newLineStart: 7, newLineEnd: 9, diffHash: "sha256:diff", fileHash: "file-hash", changeKind: "added" });
  });

  it("stores canonical quote from current source lines instead of selected deleted diff text", () => {
    const draft = diffCommentDraft(
      {
        ...file,
        content: "kept before\ncurrent replacement\nkept after\n",
      },
      1,
      3,
      "added",
      "kept before\nremoved old line\ncurrent replacement\nkept after",
    );
    expect(draft.anchor.canonical.quote).toBe(
      "kept before\ncurrent replacement\nkept after",
    );
  });

  it("migrates legacy current-side anchors when loading a comment", () => {
    const result = normalizeCommentCreateInput({ path: "src/a.ts", body: "legacy", anchor: { surface: "diff", canonical: { path: "src/a.ts" }, diff: { path: "src/a.ts", side: "current", lineStart: 2, lineEnd: 3, changeKind: "added" } } }, { resolvedPath: "src/a.ts", fileHash: "file-hash", viewerKind: "code" });
    expect(result.anchor.diff).toMatchObject({ side: "new", base: "HEAD", ref: "working-tree", newLineStart: 2, newLineEnd: 3 });
    expect(result.anchor.canonical).toMatchObject({ lineStart: 2, lineEnd: 3 });
  });
});
