import { useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";

interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
}

export function MermaidViewer({ file }: { file: FilePayload }) {
  const [mode, setMode] = useState<"preview" | "source">("preview");
  const edges = parseMermaidEdges(file.content);
  const nodes = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))];

  return (
    <section className="mermaid-viewer">
      <div className="viewer-toolbar">
        <strong>{file.path}</strong>
        <span className="sandbox-status">
          Safe Mermaid preview · scripts inactive
        </span>
        <div className="segmented-control" aria-label="Mermaid view mode">
          <button
            className={mode === "preview" ? "active" : ""}
            type="button"
            onClick={() => setMode("preview")}
          >
            Preview
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
      {mode === "preview" && edges.length ? (
        <div className="mermaid-stage">
          <svg
            className="mermaid-svg"
            role="img"
            aria-label={`Mermaid preview for ${file.path}`}
            viewBox={`0 0 760 ${Math.max(180, nodes.length * 82)}`}
          >
            <defs>
              <marker
                id="pathlens-arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M0,0 L8,4 L0,8 Z" />
              </marker>
            </defs>
            {edges.map((edge, index) => {
              const fromIndex = nodes.indexOf(edge.from);
              const toIndex = nodes.indexOf(edge.to);
              const y1 = 48 + fromIndex * 78;
              const y2 = 48 + toIndex * 78;
              const midY = (y1 + y2) / 2;
              return (
                <g key={`${edge.from}-${edge.to}-${index}`}>
                  <path
                    className="mermaid-edge"
                    d={`M250 ${y1} C390 ${y1}, 390 ${y2}, 510 ${y2}`}
                  />
                  {edge.label ? (
                    <text className="mermaid-label" x="382" y={midY - 6}>
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {nodes.map((node, index) => {
              const y = 28 + index * 78;
              return (
                <g key={node} className="mermaid-node">
                  <rect x="38" y={y} width="210" height="42" rx="8" />
                  <text x="58" y={y + 27}>
                    {node}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : mode === "preview" ? (
        <div className="unsupported">
          <h2>{file.path}</h2>
          <p>
            This Mermaid file is readable as source, but the lightweight preview
            only supports simple flowchart arrows.
          </p>
        </div>
      ) : (
        <pre className="markdown-source">{file.content}</pre>
      )}
    </section>
  );
}

export function parseMermaidEdges(content: string): MermaidEdge[] {
  return content
    .split(/\r?\n/)
    .flatMap((line) => {
      const normalized = line.trim().replace(/;$/, "");
      if (!normalized || /^(graph|flowchart)\b/i.test(normalized)) return [];
      const match = /^(.+?)\s*-{1,2}>(?:\|(.+?)\|)?\s*(.+)$/.exec(normalized);
      if (!match) return [];
      return [
        {
          from: cleanMermaidNode(match[1]),
          label: match[2]?.trim(),
          to: cleanMermaidNode(match[3]),
        },
      ];
    })
    .filter((edge) => edge.from && edge.to);
}

function cleanMermaidNode(value: string): string {
  return value
    .trim()
    .replace(/^[A-Za-z0-9_]+\[/, "")
    .replace(/\]$/, "")
    .replace(/^["']|["']$/g, "");
}
