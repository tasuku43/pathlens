import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { FilePayload } from "../src/domain/fs-node.js";
import { FileViewer } from "../src/ui/components/FileViewer.js";
import { Inspector } from "../src/ui/components/Inspector.js";
import {
  CodeViewer,
  extractHighlightedLines,
} from "../src/ui/viewers/CodeViewer.js";
import { HtmlViewer } from "../src/ui/viewers/HtmlViewer.js";

const codeFile: FilePayload = {
  path: "src/app.ts",
  viewerKind: "code",
  encoding: "utf8",
  content: "export function start() {\n  return true;\n}\n",
  etag: "sha256:test",
  size: 42,
  mtimeMs: 1,
};

it("renders code with stable line numbers and selected ranges", () => {
  const html = renderToStaticMarkup(
    <CodeViewer
      file={codeFile}
      theme="dark"
      selectedRange={{ start: 1, end: 2 }}
      onSelectionChange={() => undefined}
    />,
  );

  expect(html).toContain('aria-label="Code viewer for src/app.ts"');
  expect(html).toContain('class="code-line selected"');
  expect(html).toContain('aria-label="Select line 1"');
  expect(html).toContain("Copy ref");
  expect(html).toContain("Copy range");
});

it("extracts shiki line spans without losing nested syntax spans", () => {
  expect(
    extractHighlightedLines(
      '<pre><code><span class="line"><span style="color:red">const</span> x</span>\n<span class="line">y</span></code></pre>',
    ),
  ).toEqual(['<span style="color:red">const</span> x', "y"]);
});

it("keeps the HTML viewer sandboxed and exposes source mode controls", () => {
  const html = renderToStaticMarkup(
    <HtmlViewer
      file={{ ...codeFile, path: "index.html", viewerKind: "html" }}
      allowHtmlScripts={false}
    />,
  );

  expect(html).toContain("sandboxed · scripts off");
  expect(html).toContain("Preview");
  expect(html).toContain("Source");
  expect(html).toContain('sandbox=""');
  expect(html).toContain("/preview/html?path=index.html");
});

it("dispatches JSON files through formatted read-only code view", () => {
  const html = renderToStaticMarkup(
    <FileViewer
      file={{
        ...codeFile,
        path: "data/sample.json",
        viewerKind: "json",
        content: '{"ok":true}',
      }}
      allowHtmlScripts={false}
      theme="dark"
      selectedCodeRange={null}
      onCodeSelectionChange={() => undefined}
    />,
  );

  expect(html).toContain("data/sample.json");
  expect(html).toContain('"ok": true');
});

it("renders code metadata and actionable review events in the inspector", () => {
  const html = renderToStaticMarkup(
    <Inspector
      file={codeFile}
      outline={[]}
      events={[
        {
          id: "2:change:src/app.ts:10",
          event: { type: "change", path: "src/app.ts", version: 2 },
          receivedAt: 10,
        },
      ]}
      selectedCodeRange={{ start: 2, end: 2 }}
      activePaneId="main"
      onOutlineSelect={() => undefined}
      onOpenEventPath={() => undefined}
      onOpenAllChanged={() => undefined}
      onTargetHoverChange={() => undefined}
      onRevealTarget={() => undefined}
    />,
  );

  expect(html).toContain("Code inspector");
  expect(html).toContain("src/app.ts:2");
  expect(html).toContain("export");
  expect(html).toContain("start");
  expect(html).toContain("Review queue");
  expect(html).toContain("Changed");
});
