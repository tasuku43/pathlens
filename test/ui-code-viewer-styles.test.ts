import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/ui/styles.css", "utf8");

describe("code viewer line actions", () => {
  it("keeps the comment action on a fixed gutter rail", () => {
    expect(styles).toContain(
      "grid-template-columns: 64px max-content minmax(0, 1fr);",
    );
    expect(styles).toContain(
      "grid-template-columns: 48px max-content minmax(0, 1fr);",
    );
    expect(styles).toMatch(
      /\.code-line-comment-action \{[\s\S]*?position: absolute;[\s\S]*?left: 5px;/,
    );
  });
});
