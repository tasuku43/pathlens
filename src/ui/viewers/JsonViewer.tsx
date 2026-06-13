import { useMemo, useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";

export function JsonViewer({ file }: { file: FilePayload }) {
  const [mode, setMode] = useState<"tree" | "source">("tree");
  const parsed = useMemo(() => parseJson(file.content), [file.content]);
  const source = parsed.ok
    ? `${JSON.stringify(parsed.value, null, 2)}\n`
    : file.content;

  return (
    <section className="json-viewer">
      <div className="viewer-toolbar">
        <strong>{file.path}</strong>
        <span className="sandbox-status">
          {parsed.ok ? "JSON tree" : "Invalid JSON, source shown"}
        </span>
        <div className="segmented-control" aria-label="JSON view mode">
          <button
            className={mode === "tree" ? "active" : ""}
            type="button"
            onClick={() => setMode("tree")}
          >
            Tree
          </button>
          <button
            className={mode === "source" ? "active" : ""}
            type="button"
            onClick={() => setMode("source")}
          >
            Source
          </button>
        </div>
      </div>
      {mode === "tree" && parsed.ok ? (
        <div className="json-tree">
          <JsonNode name={file.path} value={parsed.value} depth={0} />
        </div>
      ) : (
        <pre className="markdown-source">{source}</pre>
      )}
    </section>
  );
}

function JsonNode({
  name,
  value,
  depth,
}: {
  name: string;
  value: unknown;
  depth: number;
}) {
  if (depth > 8) {
    return (
      <div className="json-node">
        <span className="json-key">{name}</span>
        <span className="json-value muted">Depth limit</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <details className="json-node" open={depth < 2}>
        <summary>
          <span className="json-key">{name}</span>
          <span className="json-value">Array({value.length})</span>
        </summary>
        <div className="json-children">
          {value.map((item, index) => (
            <JsonNode
              key={index}
              name={`${index}`}
              value={item}
              depth={depth + 1}
            />
          ))}
        </div>
      </details>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <details className="json-node" open={depth < 2}>
        <summary>
          <span className="json-key">{name}</span>
          <span className="json-value">Object({entries.length})</span>
        </summary>
        <div className="json-children">
          {entries.map(([key, item]) => (
            <JsonNode key={key} name={key} value={item} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="json-node leaf">
      <span className="json-key">{name}</span>
      <span className={`json-value ${jsonValueClass(value)}`}>
        {formatJsonScalar(value)}
      </span>
    </div>
  );
}

function parseJson(
  content: string,
): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch {
    return { ok: false };
  }
}

function formatJsonScalar(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  return String(value);
}

function jsonValueClass(value: unknown): string {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value === null) return "null";
  return "";
}
