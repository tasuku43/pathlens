export function WorkbenchPendingFileMessage({ path }: { path: string }) {
  return (
    <div className="empty-viewer" aria-live="polite">
      Loading preview for <strong>{path}</strong>...
    </div>
  );
}
