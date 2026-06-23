import type { ReactNode } from "react";

export function DiffToggleButton({
  enabled,
  path,
  onToggle,
}: {
  enabled?: boolean;
  path: string;
  onToggle?: () => void;
}) {
  return (
    <button
      aria-pressed={Boolean(enabled)}
      className={`diff-toggle${enabled ? " active" : ""}`}
      data-diff-enabled={String(Boolean(enabled))}
      data-testid="viewer-diff-toggle"
      data-viewer-path={path}
      type="button"
      onClick={onToggle}
    >
      Diff from HEAD
    </button>
  );
}

export function ViewerModeButton({
  active,
  children,
  mode,
  path,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  mode: string;
  path: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={active ? "active" : ""}
      data-active={String(active)}
      data-testid="viewer-mode-option"
      data-viewer-mode={mode}
      data-viewer-path={path}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
