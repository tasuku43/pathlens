import { Fragment, useEffect, useRef, useState } from "react";
import type { TextDiff } from "../../domain/change-review.js";
import type { ViviComment } from "../../domain/comments.js";
import type { FilePayload } from "../../domain/fs-node.js";
import {
  currentScopeForLine,
  detectCodeSymbols,
  formatLineReference,
  formatSelectedCodeWithLineNumbers,
  lineInRange,
  normalizeLineRange,
  splitCodeLines,
  type LineRange,
} from "../state/code-viewer.js";
import {
  codeCommentThreadKey,
  codeCommentThreads,
  commentsForLine,
  lineRangeForQuote,
  rectLikeFromElement,
  scheduleSelectionCommentUpdate,
  selectedLineRangeInElement,
  selectionCommentTargetInElement,
  sourceCommentDraft,
  sourceLineCommentDraft,
  type CodeCommentThread as CodeCommentThreadModel,
  type CommentCreateHandler,
  type CommentDraft,
  type CommentStatusChangeHandler,
} from "../state/comments.js";
import { iconForPath, languageForPath } from "../state/file-icons.js";
import type { ResolvedTheme } from "../state/theme.js";
import { CodeCommentThread } from "../components/CodeCommentThread.js";
import { DiffViewer } from "./DiffViewer.js";

export function CodeViewer({
  file,
  theme,
  selectedRange,
  refreshedAt,
  diff,
  diffLoading,
  diffEnabled,
  diffFocusChanges,
  onSelectionChange,
  onDiffToggle,
  onDiffFocusChange,
  onCreateComment,
  comments = [],
  activeCommentId,
  onOpenComment,
  onCloseComment,
  onCommentStatusChange,
}: {
  file: FilePayload;
  theme: ResolvedTheme;
  selectedRange: LineRange | null;
  refreshedAt?: number;
  diff?: TextDiff | null;
  diffLoading?: boolean;
  diffEnabled?: boolean;
  diffFocusChanges?: boolean;
  onSelectionChange: (range: LineRange | null) => void;
  onDiffToggle?: () => void;
  onDiffFocusChange?: (focusChanges: boolean) => void;
  onCreateComment?: CommentCreateHandler;
  comments?: ViviComment[];
  activeCommentId?: string | null;
  onOpenComment?: (id: string, rect: DOMRectLike) => void;
  onCloseComment?: () => void;
  onCommentStatusChange?: CommentStatusChangeHandler;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [anchorLine, setAnchorLine] = useState<number | null>(null);
  const [draftThread, setDraftThread] = useState<{
    thread: CodeCommentThreadModel;
    draft: CommentDraft;
  } | null>(null);
  const [openThreadKey, setOpenThreadKey] = useState<string | null>(null);
  const [lineDragging, setLineDragging] = useState(false);
  const codeLinesRef = useRef<HTMLDivElement | null>(null);
  const lineDragRef = useRef<{
    start: number;
    current: number;
    moved: boolean;
  } | null>(null);
  const suppressLineClickRef = useRef(false);
  const language = languageForPath(file.path, file.viewerKind);
  const lines = splitCodeLines(file.content);
  const highlightedLines = html ? extractHighlightedLines(html) : null;
  const symbols = detectCodeSymbols(file.path, file.content);
  const selected = selectedRange
    ? normalizeLineRange(selectedRange.start, selectedRange.end, lines.length)
    : null;
  const currentScope = currentScopeForLine(symbols, selected?.start ?? 1);
  const commentThreads = codeCommentThreads(comments);
  const activeThread = activeCommentId
    ? commentThreads.find((thread) =>
        thread.comments.some((comment) => comment.id === activeCommentId),
      )
    : undefined;
  const visibleThreadKey =
    draftThread?.thread.key ?? openThreadKey ?? activeThread?.key ?? null;

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    import("../state/highlighter.js")
      .then(({ highlightCode }) => highlightCode(file.content, language, theme))
      .then((highlighted) => {
        if (!cancelled) setHtml(highlighted);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [file.content, language, theme]);

  useEffect(() => {
    setAnchorLine(null);
    setOpenThreadKey(null);
    setDraftThread(null);
  }, [file.path]);

  function selectLine(lineNumber: number, shiftKey: boolean) {
    const next =
      shiftKey && anchorLine
        ? normalizeLineRange(anchorLine, lineNumber, lines.length)
        : normalizeLineRange(lineNumber, lineNumber, lines.length);
    setAnchorLine(shiftKey && anchorLine ? anchorLine : lineNumber);
    onSelectionChange(next);
  }

  function beginLineDrag(event: React.PointerEvent, lineNumber: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    window.getSelection()?.removeAllRanges();
    lineDragRef.current = {
      start: lineNumber,
      current: lineNumber,
      moved: false,
    };
    setLineDragging(true);
    setDraftThread(null);
    setOpenThreadKey(null);
    setAnchorLine(lineNumber);
    onSelectionChange({ start: lineNumber, end: lineNumber });
    onCloseComment?.();
  }

  function extendLineDrag(lineNumber: number) {
    const drag = lineDragRef.current;
    if (!drag || drag.current === lineNumber) return;
    drag.current = lineNumber;
    drag.moved = true;
    onSelectionChange(normalizeLineRange(drag.start, lineNumber, lines.length));
  }

  useEffect(() => {
    const trackLineDrag = (event: PointerEvent) => {
      if (!lineDragRef.current) return;
      const row = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>(".code-line[data-line]");
      const lineNumber = Number(row?.dataset.line);
      if (Number.isInteger(lineNumber) && lineNumber > 0) {
        extendLineDrag(lineNumber);
      }
    };
    const finishLineDrag = () => {
      const drag = lineDragRef.current;
      lineDragRef.current = null;
      setLineDragging(false);
      if (!drag?.moved) return;
      const range = normalizeLineRange(drag.start, drag.current, lines.length);
      suppressLineClickRef.current = true;
      window.setTimeout(() => {
        suppressLineClickRef.current = false;
      }, 0);
      startRangeComment(
        range,
        lines.slice(range.start - 1, range.end).join("\n"),
      );
    };
    window.addEventListener("pointermove", trackLineDrag);
    window.addEventListener("pointerup", finishLineDrag);
    window.addEventListener("pointercancel", finishLineDrag);
    return () => {
      window.removeEventListener("pointermove", trackLineDrag);
      window.removeEventListener("pointerup", finishLineDrag);
      window.removeEventListener("pointercancel", finishLineDrag);
    };
  }, [file.path, file.content]);

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(label);
      window.setTimeout(() => setCopyStatus(null), 1600);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  function updateSelectionComment() {
    const selection = selectionCommentTargetInElement(codeLinesRef.current);
    if (!selection) return;
    const range =
      selectedLineRangeInElement(codeLinesRef.current) ??
      lineRangeForQuote(file.content, selection.text);
    if (!range) return;
    startRangeComment(range, selection.text);
    window.getSelection()?.removeAllRanges();
  }

  function startLineComment(lineNumber: number) {
    const range =
      selected && selected.end === lineNumber
        ? selected
        : { start: lineNumber, end: lineNumber };
    startRangeComment(
      range,
      lines.slice(range.start - 1, range.end).join("\n"),
    );
  }

  function startRangeComment(range: LineRange, quote?: string) {
    const normalized = normalizeLineRange(range.start, range.end, lines.length);
    const key = codeCommentThreadKey(
      file.path,
      normalized.start,
      normalized.end,
    );
    setDraftThread({
      thread: {
        key,
        path: file.path,
        lineStart: normalized.start,
        lineEnd: normalized.end,
        comments: [],
      },
      draft: sourceCommentDraft(file, normalized, quote),
    });
    setAnchorLine(normalized.start);
    setOpenThreadKey(null);
    onSelectionChange(normalized);
    onCloseComment?.();
  }

  function openCommentThread(
    thread: (typeof commentThreads)[number],
    target: Element,
  ) {
    setDraftThread(null);
    setOpenThreadKey(thread.key);
    onSelectionChange({ start: thread.lineStart, end: thread.lineEnd });
    const firstComment = thread.comments[0];
    if (firstComment) {
      onOpenComment?.(firstComment.id, rectLikeFromElement(target));
    }
  }

  function closeCommentThread() {
    setDraftThread(null);
    setOpenThreadKey(null);
    onSelectionChange(null);
    onCloseComment?.();
  }

  useEffect(() => {
    if (!activeCommentId) return;
    if (activeThread) {
      onSelectionChange({
        start: activeThread.lineStart,
        end: activeThread.lineEnd,
      });
    }
    const comment = codeLinesRef.current?.querySelector<HTMLElement>(
      `[data-comment-id="${CSS.escape(activeCommentId)}"]`,
    );
    if (!comment) return;
    const frame = window.requestAnimationFrame(() => {
      comment.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeCommentId]);

  return (
    <section className="code-pro" aria-label={`Code viewer for ${file.path}`}>
      <div className="code-pro-header">
        <div className="code-pro-title">
          <span className="file-icon">
            {iconForPath(file.path, file.viewerKind)}
          </span>
          <span>{file.path}</span>
          <small>{language}</small>
        </div>
        <div className="code-pro-actions">
          {refreshedAt ? (
            <span className="refresh-pill">
              refreshed {new Date(refreshedAt).toLocaleTimeString()}
            </span>
          ) : null}
          {selected ? (
            <>
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    formatLineReference(file.path, selected),
                    "Reference copied",
                  )
                }
              >
                Copy ref
              </button>
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    formatSelectedCodeWithLineNumbers(
                      file.path,
                      file.content,
                      selected,
                    ),
                    "Code copied",
                  )
                }
              >
                Copy range
              </button>
              <button type="button" onClick={closeCommentThread}>
                Clear
              </button>
            </>
          ) : (
            <span className="muted">Read-only</span>
          )}
          {copyStatus ? (
            <span className="copy-status">{copyStatus}</span>
          ) : null}
          <button
            aria-pressed={Boolean(diffEnabled)}
            className={`diff-toggle${diffEnabled ? " active" : ""}`}
            type="button"
            onClick={onDiffToggle}
          >
            Diff from HEAD
          </button>
        </div>
      </div>
      <div className="code-scope-bar">
        <span>Current scope</span>
        <strong>
          {currentScope
            ? `${currentScope.kind} ${currentScope.name} · line ${currentScope.line}`
            : "Top of file"}
        </strong>
      </div>
      {diffEnabled ? (
        <DiffViewer
          path={file.path}
          diff={diff ?? null}
          loading={diffLoading}
          focusChanges={diffFocusChanges}
          renderKind="source"
          onFocusChangesChange={onDiffFocusChange}
          file={file}
          onCreateComment={onCreateComment}
          comments={comments}
          activeCommentId={activeCommentId}
          onOpenComment={onOpenComment}
        />
      ) : (
        <div
          className={`code-lines${lineDragging ? " is-line-dragging" : ""}`}
          role="list"
          ref={codeLinesRef}
          onMouseUp={() =>
            scheduleSelectionCommentUpdate(updateSelectionComment)
          }
          onKeyUp={updateSelectionComment}
        >
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const selectedLine = lineInRange(lineNumber, selected);
            const selectionStart = selected?.start === lineNumber;
            const selectionEnd = selected?.end === lineNumber;
            const highlighted = highlightedLines?.[index];
            const lineComments = commentsForLine(comments, lineNumber);
            const firstComment = lineComments[0];
            const containingThread = firstComment
              ? commentThreads.find((thread) =>
                  thread.comments.some(
                    (comment) => comment.id === firstComment.id,
                  ),
                )
              : undefined;
            const rowThread =
              containingThread?.lineEnd === lineNumber
                ? containingThread
                : commentThreads.find(
                    (thread) =>
                      thread.lineStart === lineNumber &&
                      thread.lineEnd === lineNumber,
                  );
            const displayedThread = commentThreads.find(
              (thread) =>
                thread.key === visibleThreadKey &&
                thread.lineEnd === lineNumber,
            );
            const persistedDraftThread = draftThread
              ? commentThreads.find(
                  (thread) => thread.key === draftThread.thread.key,
                )
              : undefined;
            const draftingRangeLine = Boolean(
              draftThread &&
              !persistedDraftThread &&
              lineNumber >= draftThread.thread.lineStart &&
              lineNumber <= draftThread.thread.lineEnd,
            );
            const draftingThread = Boolean(
              draftingRangeLine && draftThread?.thread.lineEnd === lineNumber,
            );
            const threadOpen = Boolean(displayedThread || draftingThread);
            const activeCommentLine = lineComments.some(
              (comment) => comment.id === activeCommentId,
            );
            const className = [
              "code-line",
              selectedLine ? "selected" : "",
              selectionStart ? "selection-start" : "",
              selectionEnd ? "selection-end" : "",
              lineComments.length ? "has-comment" : "",
              activeCommentLine ? "active-comment" : "",
              draftingRangeLine ? "drafting-comment" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const threadForDisplay =
              displayedThread ??
              (draftingThread && draftThread ? draftThread.thread : null);
            const threadDraft = displayedThread
              ? sourceCommentDraft(
                  file,
                  {
                    start: displayedThread.lineStart,
                    end: displayedThread.lineEnd,
                  },
                  lines
                    .slice(
                      displayedThread.lineStart - 1,
                      displayedThread.lineEnd,
                    )
                    .join("\n"),
                )
              : (draftThread?.draft ??
                sourceLineCommentDraft(file, lineNumber));
            return (
              <Fragment key={lineNumber}>
                <div
                  className={className}
                  data-line={lineNumber}
                  role="listitem"
                  onPointerEnter={() => extendLineDrag(lineNumber)}
                  onClick={(event) => {
                    if (containingThread) {
                      openCommentThread(containingThread, event.currentTarget);
                      return;
                    }
                    selectLine(lineNumber, event.shiftKey);
                  }}
                >
                  <button
                    className={`code-line-comment-action${rowThread ? " has-thread" : ""}`}
                    type="button"
                    aria-expanded={threadOpen}
                    aria-label={
                      rowThread
                        ? `Open comment thread on line ${lineNumber}`
                        : `Add comment on line ${lineNumber}`
                    }
                    data-comment-id={rowThread?.comments[0]?.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (threadOpen) {
                        closeCommentThread();
                      } else if (rowThread) {
                        openCommentThread(rowThread, event.currentTarget);
                      } else {
                        startLineComment(lineNumber);
                      }
                    }}
                  >
                    {rowThread ? (
                      <span className="code-line-comment-count">
                        {rowThread.comments.length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    className="line-number"
                    type="button"
                    aria-label={`Select line ${lineNumber}`}
                    onPointerDown={(event) => beginLineDrag(event, lineNumber)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (suppressLineClickRef.current) return;
                      selectLine(lineNumber, event.shiftKey);
                    }}
                  >
                    {lineNumber}
                  </button>
                  <code
                    className="line-code"
                    dangerouslySetInnerHTML={{
                      __html: highlighted ?? escapeHtml(line || " "),
                    }}
                  />
                </div>
                {threadForDisplay ? (
                  <div className="code-comment-thread-row" role="listitem">
                    <CodeCommentThread
                      thread={threadForDisplay}
                      draft={threadDraft}
                      onCreateComment={onCreateComment}
                      onStatusChange={onCommentStatusChange}
                      onClose={closeCommentThread}
                    />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface DOMRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function extractHighlightedLines(html: string): string[] {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(html, "text/html");
    const lineNodes = [...document.querySelectorAll("span.line")];
    if (lineNodes.length) return lineNodes.map((line) => line.innerHTML || " ");
  }
  const code = /<code[^>]*>([\s\S]*?)<\/code>/i.exec(html)?.[1] ?? html;
  const lineMatches = extractLineSpanContents(code);
  if (lineMatches.length) return lineMatches.map((line) => line || " ");
  return code.split(/\r?\n/).map((line) => line || " ");
}

function extractLineSpanContents(code: string): string[] {
  const lines: string[] = [];
  const openMarker = '<span class="line">';
  let index = 0;
  while (index < code.length) {
    const start = code.indexOf(openMarker, index);
    if (start < 0) break;
    let cursor = start + openMarker.length;
    let depth = 1;
    while (cursor < code.length && depth > 0) {
      const nextOpen = code.indexOf("<span", cursor);
      const nextClose = code.indexOf("</span>", cursor);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        cursor = nextOpen + 5;
      } else {
        depth -= 1;
        if (depth === 0) {
          lines.push(code.slice(start + openMarker.length, nextClose));
          cursor = nextClose + "</span>".length;
          break;
        }
        cursor = nextClose + "</span>".length;
      }
    }
    index = cursor;
  }
  return lines;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
