import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  commentsForPath,
  htmlDiff,
  sampleFiles,
} from "../../../storybook/fixtures/review-lab.js";
import { HtmlViewer } from "./HtmlViewer.js";

const meta = {
  title: "Viewers/HTML/HtmlViewer",
  component: HtmlViewer,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "todo" },
  },
  args: {
    file: sampleFiles.html,
    allowHtmlScripts: false,
    theme: "light",
    comments: commentsForPath(sampleFiles.html.path),
    onModeChange: () => undefined,
    onDiffToggle: () => undefined,
    onDiffFocusChange: () => undefined,
    onCreateComment: () => undefined,
    onOpenComment: () => undefined,
    onCloseComment: () => undefined,
  },
} satisfies Meta<typeof HtmlViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SourceHtmlComment: Story = {
  args: {
    mode: "source",
    activeCommentId: "comment-html-rendered",
  },
};

export const PreviewSandboxChrome: Story = {
  args: {
    mode: "preview",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The iframe preview chrome and sandbox state render in Storybook; the /preview/html server response remains covered by E2E.",
      },
    },
  },
};

export const RenderedHtmlDiffComment: Story = {
  args: {
    mode: "preview",
    diffEnabled: true,
    diff: htmlDiff,
    diffFocusChanges: true,
    activeCommentId: "comment-html-rendered",
  },
};

export const SourceDiffMode: Story = {
  args: {
    mode: "source",
    diffEnabled: true,
    diff: htmlDiff,
  },
};
