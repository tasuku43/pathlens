import type { Meta, StoryObj } from "@storybook/react-vite";
import { DiffViewer } from "./DiffViewer.js";

const meta = {
  title: "File Context/Diff comments",
  component: DiffViewer,
} satisfies Meta<typeof DiffViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
const file = {
  path: "src/example.ts",
  viewerKind: "code" as const,
  encoding: "utf8" as const,
  content: "const answer = 42;\n",
  etag: "file-42",
  size: 19,
  mtimeMs: 1,
};
const diff = {
  path: file.path,
  status: "available" as const,
  baseLabel: "HEAD",
  compareLabel: "working tree",
  content: "@@ -1,1 +1,1 @@\n-const answer = 41;\n+const answer = 42;",
};
const comment = {
  id: "comment-1",
  threadId: "thread-1",
  path: file.path,
  viewerKind: "text" as const,
  body: "Is this the final value?",
  status: "open" as const,
  createdAt: "2026-06-20T00:00:00Z",
  updatedAt: "2026-06-20T00:00:00Z",
  anchor: {
    surface: "diff" as const,
    canonical: {
      path: file.path,
      lineStart: 1,
      lineEnd: 1,
      fileHash: file.etag,
    },
    diff: {
      path: file.path,
      base: "HEAD",
      ref: "working-tree",
      hunkId: "@@ -1,1 +1,1 @@",
      side: "new" as const,
      newLineStart: 1,
      newLineEnd: 1,
      fileHash: file.etag,
    },
  },
};
export const OpenThread: Story = {
  args: {
    path: file.path,
    renderKind: "source",
    file,
    diff,
    comments: [comment],
  },
};
export const ResolvedThread: Story = {
  args: { ...OpenThread.args!, comments: [{ ...comment, status: "resolved" }] },
};
export const ArchivedThread: Story = {
  args: { ...OpenThread.args!, comments: [{ ...comment, status: "archived" }] },
};
