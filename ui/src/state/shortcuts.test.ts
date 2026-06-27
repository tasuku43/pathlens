import { describe, expect, it } from "vitest";
import { keyboardShortcutAction, type ShortcutKeyEvent } from "./shortcuts.js";

function commandEvent(input: Partial<ShortcutKeyEvent>): ShortcutKeyEvent {
  return {
    key: "i",
    metaKey: true,
    ctrlKey: false,
    shiftKey: false,
    ...input,
  };
}

describe("keyboardShortcutAction", () => {
  it("keeps Cmd/Ctrl+I focused on the current inline thread", () => {
    expect(keyboardShortcutAction(commandEvent({ key: "i" }))).toBe(
      "focus-current-inline-thread",
    );
  });

  it("maps Cmd/Ctrl+Shift+I to in-review replies", () => {
    expect(
      keyboardShortcutAction(commandEvent({ key: "i", shiftKey: true })),
    ).toBe("open-in-review-reply");
  });

  it("keeps Cmd/Ctrl+Shift+U mapped to unseen work", () => {
    expect(
      keyboardShortcutAction(commandEvent({ key: "u", shiftKey: true })),
    ).toBe("open-latest-unread");
  });
});
