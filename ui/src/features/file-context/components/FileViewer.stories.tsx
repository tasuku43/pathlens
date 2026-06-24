import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  commentsForPath,
  sampleFiles,
} from "../../../storybook/fixtures/review-lab.js";
import {
  extractHtmlOutline,
  extractMarkdownOutline,
} from "../../../state/outline.js";
import { FileViewer } from "./FileViewer.js";

const meta = {
  title: "Viewers/File Coverage/FileViewer",
  component: FileViewer,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "todo" },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: "100vh", background: "#090d15" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    file: sampleFiles.unknownText,
    allowHtmlScripts: false,
    theme: "light",
    selectedCodeRange: null,
    comments: [],
    onCodeSelectionChange: () => undefined,
    onViewerModeChange: () => undefined,
    onDiffToggle: () => undefined,
    onCreateComment: () => undefined,
    onOpenComment: () => undefined,
    onCloseComment: () => undefined,
    onCommentStatusChange: () => undefined,
  },
} satisfies Meta<typeof FileViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnknownTextFallback: Story = {};

export const MarkdownKnownViewer: Story = {
  args: {
    file: sampleFiles.markdown,
    viewerMode: "rendered",
    comments: commentsForPath(sampleFiles.markdown.path),
  },
};

export const MarkdownWithLocalOutline: Story = {
  args: {
    file: sampleFiles.markdown,
    viewerMode: "rendered",
    outline: extractMarkdownOutline(sampleFiles.markdown.content),
    comments: commentsForPath(sampleFiles.markdown.path),
    onOutlineSelect: () => undefined,
  },
};

export const MarkdownWithOpenLocalOutline: Story = {
  args: {
    file: sampleFiles.markdown,
    viewerMode: "rendered",
    defaultOutlineOpen: true,
    outline: extractMarkdownOutline(sampleFiles.markdown.content),
    comments: commentsForPath(sampleFiles.markdown.path),
    onOutlineSelect: () => undefined,
  },
};

export const CodeWithLocalOutline: Story = {
  args: {
    file: sampleFiles.code,
    theme: "dark",
    selectedCodeRange: { start: 4, end: 4 },
  },
};

export const CodeWithOpenLocalOutline: Story = {
  args: {
    file: sampleFiles.code,
    theme: "dark",
    defaultOutlineOpen: true,
    selectedCodeRange: { start: 4, end: 4 },
  },
};

export const HtmlKnownViewer: Story = {
  args: {
    file: sampleFiles.html,
    viewerMode: "preview",
    comments: commentsForPath(sampleFiles.html.path),
  },
};

export const HtmlWithOpenLocalOutline: Story = {
  args: {
    file: sampleFiles.html,
    viewerMode: "preview",
    defaultOutlineOpen: true,
    outline: extractHtmlOutline(sampleFiles.html.content),
    comments: commentsForPath(sampleFiles.html.path),
    onOutlineSelect: () => undefined,
  },
};

export const JsonKnownViewer: Story = {
  args: {
    file: sampleFiles.json,
  },
};

export const CsvTableFallback: Story = {
  args: {
    file: sampleFiles.csv,
  },
};

export const MermaidKnownViewer: Story = {
  args: {
    file: sampleFiles.mermaid,
  },
};

export const ImageKnownViewer: Story = {
  args: {
    file: sampleFiles.image,
  },
};

export const BinaryMetadata: Story = {
  args: {
    file: sampleFiles.binary,
  },
};

export const LargeTextLimitedPreview: Story = {
  args: {
    file: sampleFiles.largeText,
  },
};

export const LargeBinaryMetadata: Story = {
  args: {
    file: sampleFiles.largeBinary,
  },
};

export const ViewerToolbarChromeConsistency: Story = {
  tags: ["interaction"],
  render: (args) => {
    const files = [
      sampleFiles.markdown,
      sampleFiles.html,
      sampleFiles.code,
      sampleFiles.unknownText,
      sampleFiles.json,
    ];
    return (
      <div
        style={{
          display: "grid",
          gap: 16,
          padding: 16,
          background: "#090d15",
        }}
      >
        {files.map((file) => (
          <div
            key={file.path}
            style={{
              height: 220,
              overflow: "auto",
              border: "1px solid var(--line)",
            }}
          >
            <FileViewer
              {...args}
              file={file}
              viewerMode={
                file.viewerKind === "html" ? "preview" : args.viewerMode
              }
              selectedCodeRange={
                file.viewerKind === "code" ? { start: 4, end: 4 } : null
              }
              theme={file.viewerKind === "code" ? "dark" : args.theme}
              comments={commentsForPath(file.path)}
            />
          </div>
        ))}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(
        canvasElement.querySelectorAll(
          ".file-viewer-frame > section > .viewer-toolbar",
        ),
      ).toHaveLength(5);
    });

    const toolbars = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        ".file-viewer-frame > section > .viewer-toolbar",
      ),
    );
    const firstHeight = toolbars[0]?.getBoundingClientRect().height ?? 0;
    expect(firstHeight).toBeGreaterThan(0);

    for (const toolbar of toolbars) {
      const actions = toolbar.querySelector<HTMLElement>(
        ":scope > .viewer-toolbar-actions",
      );
      expect(actions).toBeTruthy();
      expect(
        Math.abs(toolbar.getBoundingClientRect().height - firstHeight),
      ).toBeLessThanOrEqual(2);
      expect(toolbar.lastElementChild).toBe(actions);
    }
  },
};
