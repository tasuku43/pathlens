export interface WorkbenchErrorMessageProps {
  error: string;
}

export function WorkbenchErrorMessage({ error }: WorkbenchErrorMessageProps) {
  const content = workbenchErrorContent(error);
  return (
    <div className="viewer-error" role="alert">
      <strong>{content.title}</strong>
      <span>{content.detail}</span>
    </div>
  );
}

export function workbenchErrorContent(error: string): {
  title: string;
  detail: string;
} {
  const message = error.trim();
  if (isFetchFailure(message)) {
    return {
      title: "Preview unavailable",
      detail:
        "Vivi could not load this preview. Select the file again after the server is ready.",
    };
  }
  return {
    title: "Preview unavailable",
    detail: message || "The preview could not be loaded.",
  };
}

function isFetchFailure(message: string): boolean {
  return /^typeerror:\s*failed to fetch$/i.test(message);
}
