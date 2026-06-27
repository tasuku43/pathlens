import { describe, expect, it } from "vitest";
import { reviewCommandActions } from "./review-command-actions.js";

describe("reviewCommandActions", () => {
  it("offers separate actions for unseen work and in-review replies", () => {
    const actions = reviewCommandActions({
      activeComment: null,
      attentionThreadCount: 0,
      canToggleDiff: false,
      diffEnabled: false,
      inReviewReplyTargetCount: 2,
      openThreadTargetCount: 2,
      reviewItemCount: 3,
      unreadReviewCount: 1,
    });

    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "open-latest-unread",
          label: "Open next unseen item",
          shortcut: "Cmd/Ctrl Shift U",
        }),
        expect.objectContaining({
          id: "open-in-review-reply",
          label: "Open next in-review reply",
          shortcut: "Cmd/Ctrl Shift I",
        }),
      ]),
    );
  });
});
