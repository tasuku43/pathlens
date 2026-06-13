import { useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";

export function TextViewer({ file }: { file: FilePayload }) {
  const [wrap, setWrap] = useState(true);
  return (
    <section className="text-viewer">
      <div className="text-toolbar">
        <strong>{file.path}</strong>
        <button type="button" onClick={() => setWrap((value) => !value)}>
          {wrap ? "No wrap" : "Wrap"}
        </button>
      </div>
      <pre className={wrap ? "plain-text wrap" : "plain-text no-wrap"}>
        {file.content}
      </pre>
    </section>
  );
}
