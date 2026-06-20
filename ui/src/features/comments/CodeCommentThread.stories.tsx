import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CommentStatus, ViviComment } from "../../domain/comments.js";
import { CodeCommentThread } from "./components/CodeCommentThread.js";

const anchor = {
  surface: "source" as const,
  canonical: { path: "src/review.ts", lineStart: 12, lineEnd: 14 },
};

function comments(status: CommentStatus): ViviComment[] {
  return [
    {
      id: "comment-1",
      threadId: "thread-1",
      path: "src/review.ts",
      viewerKind: "text",
      anchor,
      body: "Please keep the retry boundary explicit.",
      source: "human",
      status,
      createdAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-20T09:05:00.000Z",
    },
    {
      id: "comment-2",
      threadId: "thread-1",
      path: "src/review.ts",
      viewerKind: "text",
      anchor,
      body: "Updated and covered by the timeout test.",
      source: "codex",
      status,
      createdAt: "2026-06-20T09:05:00.000Z",
      updatedAt: "2026-06-20T09:05:00.000Z",
    },
  ];
}

const meta = {
  title: "Comments/Thread lifecycle",
  component: CodeCommentThread,
  parameters: { layout: "centered" },
  args: { onClose: () => undefined },
} satisfies Meta<typeof CodeCommentThread>;

export default meta;
type Story = StoryObj<typeof meta>;

function args(status: CommentStatus) {
  return {
    thread: {
      key: "thread-1",
      path: "src/review.ts",
      lineStart: 12,
      lineEnd: 14,
      comments: comments(status),
    },
    draft: {
      threadId: "thread-1",
      path: "src/review.ts",
      viewerKind: "text" as const,
      anchor,
    },
  };
}

export const Open: Story = { args: args("open") };
export const Resolved: Story = { args: args("resolved") };
export const Archived: Story = { args: args("archived") };
