import { describe, expect, it } from "vitest";
import {
  gitPartialTimeoutReason,
  gitReviewTimeoutGuidance,
  gitReviewUnavailableGuidance,
  gitTimeoutReason,
} from "./git-review-refresh.js";

describe("gitReviewUnavailableGuidance", () => {
  it("explains how to recover from full Git review timeouts", () => {
    expect(gitReviewUnavailableGuidance(gitTimeoutReason)).toBe(
      gitReviewTimeoutGuidance,
    );
  });

  it("does not add extra guidance for partial scans or unrelated errors", () => {
    expect(gitReviewUnavailableGuidance(gitPartialTimeoutReason)).toBeNull();
    expect(
      gitReviewUnavailableGuidance(
        "No git repository found under the selected root.",
      ),
    ).toBeNull();
    expect(gitReviewUnavailableGuidance(null)).toBeNull();
  });
});
