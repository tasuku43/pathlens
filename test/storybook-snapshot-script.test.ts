import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { parseSnapshotMismatchRetries } from "../scripts/capture-storybook-snapshots.mjs";

describe("Storybook snapshot capture script", () => {
  it("recaptures a mismatched snapshot once by default", () => {
    expect(parseSnapshotMismatchRetries(undefined)).toBe(1);
    expect(parseSnapshotMismatchRetries("0")).toBe(0);
    expect(parseSnapshotMismatchRetries("2")).toBe(2);
  });

  it("rejects invalid mismatch retry counts", () => {
    expect(() => parseSnapshotMismatchRetries("-1")).toThrow(
      /Invalid snapshot mismatch retry count/,
    );
    expect(() => parseSnapshotMismatchRetries("1.5")).toThrow(
      /Invalid snapshot mismatch retry count/,
    );
    expect(() => parseSnapshotMismatchRetries("abc")).toThrow(
      /Invalid snapshot mismatch retry count/,
    );
  });

  it("keeps CI snapshot artifacts available when the check job fails", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");

    expect(workflow).toContain("VIVI_STORYBOOK_SNAPSHOT_MISMATCH_RETRIES");
    expect(workflow).toContain(
      "files-viewer-coverage-states--code-with-local-outline",
    );
    expect(workflow).toContain("actions/upload-artifact@");
    expect(workflow).toContain("path: artifacts/storybook-snapshots");
    expect(workflow).toContain("if-no-files-found: ignore");
  });
});
