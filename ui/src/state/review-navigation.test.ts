import { describe, expect, it } from "vitest";
import type { ViviComment } from "../domain/comments.js";
import { agentReplyNavigationTargets } from "./review-navigation.js";

const anchor = {
  surface: "source" as const,
  canonical: {
    path: "src/app.ts",
    lineStart: 12,
    lineEnd: 12,
  },
};

function comment(input: Partial<ViviComment> & Pick<ViviComment, "id">) {
  return {
    threadId: "thread-open",
    path: "src/app.ts",
    viewerKind: "text" as const,
    anchor,
    body: "Comment body",
    status: "open" as const,
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
    ...input,
  };
}

describe("agentReplyNavigationTargets", () => {
  it("returns agent replies in open in-review threads newest first", () => {
    const targets = agentReplyNavigationTargets([
      comment({
        id: "human-open",
        source: "human",
        body: "Please check this.",
      }),
      comment({
        id: "agent-older",
        source: "codex",
        body: "Older reply.",
        updatedAt: "2026-06-20T09:05:00.000Z",
      }),
      comment({
        id: "agent-newer",
        source: "claude-code",
        body: "Newer reply.",
        updatedAt: "2026-06-20T09:10:00.000Z",
      }),
    ]);

    expect(targets.map((target) => target.commentId)).toEqual([
      "agent-newer",
      "agent-older",
    ]);
    expect(targets[0]).toMatchObject({
      id: "agent-reply:agent-newer",
      label: "In-review reply in app.ts",
      threadId: "thread-open",
    });
  });

  it("ignores agent replies from resolved threads", () => {
    const targets = agentReplyNavigationTargets([
      comment({
        id: "agent-resolved",
        source: "codex",
        status: "resolved",
        threadId: "thread-resolved",
      }),
    ]);

    expect(targets).toEqual([]);
  });
});
