# Security model

`pathlens` is local-first and read-only.

## Defaults

- Bind to `127.0.0.1`.
- Reject root escape attempts.
- Ignore sensitive large directories by default.
- Render HTML in a sandboxed iframe.
- Avoid enabling HTML scripts unless explicitly requested.
- Do not expose remote access by default.

## Path handling

All file APIs accept normalized relative paths only. Absolute paths and `..` root escapes are rejected.

## HTML preview

HTML preview is useful because generated files and examples are often HTML. It is also the riskiest viewer. The default iframe should be restrictive. Any relaxation must be explicit through CLI flags and documented in help output.
