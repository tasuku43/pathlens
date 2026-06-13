# CLI and API contract

## CLI contract

```bash
pathlens [root]
pathlens [root] --port 4317
pathlens [root] --host 127.0.0.1
pathlens [root] --open
pathlens [root] --include md,html,ts,tsx,json
pathlens [root] --allow-html-scripts
```

Default root: `.`

Default host: `127.0.0.1`

Default security posture: local-only, sandboxed HTML, scripts disabled unless explicitly allowed.

## HTTP API

### `GET /api/tree`

Returns the current filesystem tree under the selected root.

```json
{
  "root": ".",
  "version": 1,
  "nodes": [
    {
      "id": "README.md",
      "path": "README.md",
      "name": "README.md",
      "kind": "file",
      "viewerKind": "markdown",
      "parentPath": ""
    }
  ]
}
```

### `GET /api/file?path=<relative-path>`

Returns file content and metadata for a relative path under the root.

```json
{
  "path": "README.md",
  "viewerKind": "markdown",
  "encoding": "utf8",
  "content": "# Example",
  "etag": "sha256:...",
  "size": 10,
  "mtimeMs": 1710000000000
}
```

### `GET /preview/html?path=<relative-path>`

Returns HTML for iframe preview. The server must validate the path and send conservative headers.

### `GET /events`

SSE stream of filesystem events.

```json
{"type":"change","path":"README.md","version":2}
{"type":"add","path":"docs/new.md","kind":"file","version":3}
{"type":"unlink","path":"old.html","kind":"file","version":4}
```

## Contract stability rules

- Changes to API response shapes require tests and documentation updates.
- Additive fields are acceptable when documented.
- Removing fields or changing meanings requires an explicit contract-change note.
