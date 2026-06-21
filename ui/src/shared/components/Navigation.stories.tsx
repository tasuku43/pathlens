import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  sampleTabs,
  sampleWorkspaceTree,
  storyRoot,
} from "../../storybook/fixtures/review-lab.js";
import { OpenTabs } from "./OpenTabs.js";
import { ShortcutHelp } from "./ShortcutHelp.js";
import { Topbar } from "./Topbar.js";
import { TreeSidebar } from "./TreeSidebar.js";

const meta = {
  title: "Navigation/Core",
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TopbarStory: Story = {
  name: "Topbar",
  render: () => (
    <Topbar
      root={storyRoot}
      themePreference="system"
      openCommentCount={6}
      onThemeCycle={() => undefined}
      onQuickOpen={() => undefined}
      onSearchText={() => undefined}
      onOpenComments={() => undefined}
      onOpenShortcuts={() => undefined}
    />
  ),
};

export const SidebarFileTree: Story = {
  render: () => (
    <aside className="sidebar" style={{ width: 320, height: "100vh" }}>
      <div className="panel-title">
        <span>Explorer</span>
        <span className="pill">live</span>
      </div>
      <TreeSidebar
        nodes={sampleWorkspaceTree.nodes}
        selectedPath="ui/src/features/workbench/WorkbenchContainer.tsx"
        changedPaths={
          new Set([
            "ui/src/features/workbench/WorkbenchContainer.tsx",
            "docs/product-review.md",
          ])
        }
        removedPaths={new Set(["server/graphql/schema.graphqls"])}
        onSelect={() => undefined}
        onOpen={() => undefined}
      />
    </aside>
  ),
};

export const Tabs: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <OpenTabs
        tabs={sampleTabs}
        activePath="ui/src/features/workbench/WorkbenchContainer.tsx"
        paneId="main"
        onActivate={() => undefined}
        onClose={() => undefined}
        onPromote={() => undefined}
        onCloseOtherTabs={() => undefined}
        onCloseTabsToRight={() => undefined}
        onCloseUnchangedTabs={() => undefined}
        onClosePreviewTabs={() => undefined}
        onDropTab={() => undefined}
        onDragStateChange={() => undefined}
        onManualDragStart={() => undefined}
      />
    </div>
  ),
};

export const ShortcutHelpOverlay: Story = {
  render: () => <ShortcutHelp open onClose={() => undefined} />,
};

export const Statusbar: Story = {
  render: () => (
    <div className="app-shell" style={{ minHeight: 120 }}>
      <footer className="statusbar">
        <span>3 tabs · 6 to review · 5 root entries</span>
        <span>7 comments · 3 drafts · watching</span>
      </footer>
    </div>
  ),
};
