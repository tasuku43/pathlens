import { useState } from "react";
import type { FilePayload } from "../../domain/fs-node.js";

export interface ParsedDelimitedText {
  headers: string[];
  rows: string[][];
  truncated: boolean;
}

const maxTableRows = 200;
const maxTableColumns = 24;

export function CsvViewer({ file }: { file: FilePayload }) {
  const [mode, setMode] = useState<"table" | "source">("table");
  const parsed = parseDelimitedText(file.content, delimiterForPath(file.path));

  return (
    <section className="csv-viewer">
      <div className="viewer-toolbar">
        <strong>{file.path}</strong>
        <span className="sandbox-status">
          {parsed.rows.length} rows · {parsed.headers.length} columns
          {parsed.truncated ? " · preview limited" : ""}
        </span>
        <div className="segmented-control" aria-label="CSV view mode">
          <button
            className={mode === "table" ? "active" : ""}
            type="button"
            onClick={() => setMode("table")}
          >
            Table
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
      {mode === "table" ? (
        <div className="csv-table-wrap">
          <table className="csv-table">
            <thead>
              <tr>
                {parsed.headers.map((header, index) => (
                  <th key={`${header}-${index}`}>
                    {header || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {parsed.headers.map((_header, columnIndex) => (
                    <td key={columnIndex}>{row[columnIndex] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="markdown-source">{file.content}</pre>
      )}
    </section>
  );
}

export function parseDelimitedText(
  content: string,
  delimiter = ",",
): ParsedDelimitedText {
  const records = parseRecords(content, delimiter).slice(0, maxTableRows + 1);
  if (!records.length) {
    return { headers: [], rows: [], truncated: false };
  }
  const columnCount = Math.min(
    maxTableColumns,
    Math.max(...records.map((record) => record.length), 0),
  );
  const first = records[0] ?? [];
  const headers = Array.from({ length: columnCount }, (_, index) =>
    (first[index] ?? `Column ${index + 1}`).trim(),
  );
  const rows = records
    .slice(1, maxTableRows + 1)
    .map((record) => record.slice(0, columnCount));

  return {
    headers,
    rows,
    truncated:
      records.length > maxTableRows ||
      records.some((record) => record.length > maxTableColumns),
  };
}

export function isDelimitedPath(path: string): boolean {
  return /\.(csv|tsv)$/i.test(path);
}

function delimiterForPath(path: string): string {
  return /\.tsv$/i.test(path) ? "\t" : ",";
}

function parseRecords(content: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      records.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    records.push(row);
  }

  return records;
}
