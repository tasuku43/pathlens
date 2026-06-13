# Performance model

## Recommended strategy

Use watcher events as the primary signal. Use hashes and versions as validation data, not as the main detection mechanism.

## Avoid

- Full recursive content hashing on every save.
- Rendering every node in huge trees.
- Watchers per React component.
- Replacing all UI state on every event.

## MVP acceptable behavior

- Refetch the currently open file when it changes.
- Refetch the tree on add/remove events.
- Preserve selected and expanded state in the UI.

## Future behavior

- Normalize tree state by path.
- Apply semantic tree events.
- Virtualize visible tree rows.
- Add large-file partial loading.
- Add text diff patching only where profiling shows it matters.
