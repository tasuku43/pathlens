import type { Meta, StoryObj } from "@storybook/react-vite";
import { DraftReviewTray } from "./components/DraftReviewTray.js";
import { sampleDraftComments } from "../../storybook/fixtures/review-lab.js";

const meta = {
  title: "Review/Drafts/Draft Review Tray",
  component: DraftReviewTray,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
  args: {
    drafts: sampleDraftComments,
    publishing: false,
    onOpenPath: () => undefined,
    onUpdateDraft: () => undefined,
    onDeleteDraft: () => undefined,
    onPublishAll: () => undefined,
  },
} satisfies Meta<typeof DraftReviewTray>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PublishCommentsCtaVisible: Story = {};

export const PublishingBatch: Story = {
  args: {
    publishing: true,
  },
};

export const EmptyDrafts: Story = {
  args: {
    drafts: [],
  },
};

export const SingleDraftComment: Story = {
  args: {
    drafts: [sampleDraftComments[0]!],
  },
};
