import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { marked } from "marked";
import type { TextDiff } from "../../domain/change-review.js";
import type { ViviComment } from "../../domain/comments.js";
import type { FilePayload } from "../../domain/fs-node.js";
import { escapeAttribute } from "../../domain/mermaid-preview.js";
import {
  addRenderedCommentBlockIdsToHtml,
  renderedCommentBlockAttribute,
} from "../../domain/rendered-comment-blocks.js";
import {
  extractMarkdownOutline,
  renderMarkdownHtmlWithHeadingIds,
} from "../state/outline.js";
import {
  parseMarkdownFrontMatter,
  type FrontMatterEntry,
  type FrontMatterValue,
} from "../state/markdown-frontmatter.js";
import {
  renderedCommentDraft,
  scheduleSelectionCommentUpdate,
  sourceTextForLineRange,
  type CodeCommentThread as CodeCommentThreadModel,
  type CommentCreateHandler,
  type CommentDraft,
  type CommentStatusChangeHandler,
} from "../state/comments.js";
import type { LineRange } from "../state/code-viewer.js";
import {
  markdownBodyLineOffset,
  renderMarkdownHtmlWithSourceRanges,
} from "../state/markdown-comment-blocks.js";
import {
  applyRenderedCommentHighlights,
  closestRenderedCommentBlock,
  findBlocksForRenderedComment,
  isInteractiveRenderedCommentTarget,
  renderedCommentBlocksForSelection,
  renderedCommentSummaryForComment,
  rectLikeFromElement,
  type RenderedCommentBlockTarget,
  targetForRenderedCommentBlock,
  targetForRenderedCommentBlocks,
} from "../state/rendered-comment-blocks.js";
import type { ResolvedTheme } from "../state/theme.js";
import type { ViewerMode } from "../state/viewer-mode.js";
import { CodeCommentThread } from "../components/CodeCommentThread.js";
import { SourceCommentSurface } from "../components/SourceCommentSurface.js";
import { DiffViewer } from "./DiffViewer.js";
import { renderMermaidBlocks } from "./MermaidViewer.js";

export function MarkdownViewer({
  file,
  mode: controlledMode,
  diff,
  diffLoading,
  diffEnabled,
  diffFocusChanges,
  theme = "dark",
  onModeChange,
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
  mode?: ViewerMode;
  diff?: TextDiff | null;
  diffLoading?: boolean;
  diffEnabled?: boolean;
  diffFocusChanges?: boolean;
  theme?: ResolvedTheme;
  onModeChange?: (mode: ViewerMode) => void;
  onDiffToggle?: () => void;
  onDiffFocusChange?: (focusChanges: boolean) => void;
  onCreateComment?: CommentCreateHandler;
  comments?: ViviComment[];
  activeCommentId?: string | null;
  onOpenComment?: (id: string, rect: DOMRectLike) => void;
  onCloseComment?: () => void;
  onCommentStatusChange?: CommentStatusChangeHandler;
}) {
  const [localMode, setLocalMode] = useState<ViewerMode>("rendered");
  const [renderedThreadTarget, setRenderedThreadTarget] = useState<{
    blockId: string;
    blockIds: string[];
    draft: CommentDraft;
    host: HTMLElement;
    mount: HTMLElement;
  } | null>(null);
  const [sourceSelectedRange, setSourceSelectedRange] =
    useState<LineRange | null>(null);
  const mode =
    controlledMode === "source" || controlledMode === "rendered"
      ? controlledMode
      : localMode;
  const html = renderMarkdownDocumentHtml(file.content);
  const markdownRef = useRef<HTMLElement | null>(null);
  const setMode = (nextMode: ViewerMode) => {
    setRenderedThreadTarget(null);
    setLocalMode(nextMode);
    onModeChange?.(nextMode);
  };
  const renderPendingMermaid = useCallback(() => {
    if (mode !== "rendered" || diffEnabled) return;
    const markdown = markdownRef.current;
    if (!markdown) return;
    renderMermaidBlocks(markdown, theme);
  }, [diffEnabled, mode, theme]);
  const updateRenderedSelectionComment = () => {
    const blocks = renderedCommentBlocksForSelection(markdownRef.current);
    const target = targetForRenderedCommentBlocks(
      blocks,
      window.getSelection()?.toString(),
    );
    if (!target) return;
    openRenderedDraft(target, blocks);
    window.getSelection()?.removeAllRanges();
  };

  useLayoutEffect(() => {
    if (mode !== "rendered" || diffEnabled || !markdownRef.current) return;
    markdownRef.current.innerHTML = html;
    renderPendingMermaid();
  }, [diffEnabled, html, mode, renderPendingMermaid]);

  useEffect(() => {
    renderPendingMermaid();
    const timeout = window.setTimeout(renderPendingMermaid, 0);
    return () => window.clearTimeout(timeout);
  });

  useLayoutEffect(() => {
    if (mode !== "rendered" || diffEnabled) return;
    applyRenderedCommentHighlights(
      markdownRef.current,
      comments,
      activeCommentId,
      renderedThreadTarget?.blockIds,
    );
  }, [
    activeCommentId,
    comments,
    diffEnabled,
    html,
    mode,
    renderedThreadTarget,
  ]);

  useLayoutEffect(() => {
    if (
      mode !== "rendered" ||
      diffEnabled ||
      !renderedThreadTarget ||
      !markdownRef.current
    ) {
      return;
    }
    const hostBlockId = renderedThreadTarget.blockIds.at(-1);
    const block = Array.from(
      markdownRef.current.querySelectorAll<HTMLElement>(
        `[${renderedCommentBlockAttribute}]`,
      ),
    ).find((candidate) => candidate.dataset.viviCommentBlockId === hostBlockId);
    if (!block) return;
    placeRenderedThreadHost(block, renderedThreadTarget.host);
  });

  useLayoutEffect(
    () => () => {
      renderedThreadTarget?.host.remove();
    },
    [renderedThreadTarget],
  );

  useEffect(() => {
    setRenderedThreadTarget(null);
  }, [file.path]);

  const openRenderedDraft = (
    target: RenderedCommentBlockTarget,
    blocks: HTMLElement[],
  ) => {
    const hostBlock = blocks.at(-1);
    if (!hostBlock) return;
    const { host, mount } = createRenderedThreadHost(hostBlock);
    setRenderedThreadTarget({
      blockId: target.blockId,
      blockIds: target.blockIds,
      host,
      mount,
      draft: renderedCommentDraft(file, "markdown", {
        text: target.text,
        blockId: target.blockId,
        selector: target.selector,
        sourceLineStart: target.sourceLineStart,
        sourceLineEnd: target.sourceLineEnd,
        sourceQuote: sourceTextForLineRange(
          file.content,
          sourceRangeForTarget(target),
        ),
      }),
    });
  };

  const openRenderedComment = (block: HTMLElement | null) => {
    const id = block?.dataset.viviCommentId;
    if (!id || !block) return false;
    const comment = comments.find((item) => item.id === id);
    const summary = comment
      ? renderedCommentSummaryForComment(comment, "markdown")
      : null;
    const blocks =
      summary && markdownRef.current
        ? findBlocksForRenderedComment(markdownRef.current, summary)
        : [block];
    const target = targetForRenderedCommentBlocks(
      blocks.length ? blocks : [block],
    );
    if (!target) return false;
    openRenderedDraft(target, blocks.length ? blocks : [block]);
    onOpenComment?.(id, target?.rect ?? rectLikeFromElement(block));
    return true;
  };

  const startRenderedComment = (block: HTMLElement) => {
    const target = targetForRenderedCommentBlock(block);
    if (!target) return;
    openRenderedDraft(target, [block]);
    onCloseComment?.();
  };

  const closeRenderedThread = () => {
    setRenderedThreadTarget(null);
    onCloseComment?.();
  };

  const onRenderedClick = (event: MouseEvent<HTMLElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest(".rendered-comment-thread")
    ) {
      return;
    }
    const block = closestRenderedCommentBlock(
      markdownRef.current,
      event.target,
    );
    if (!block) {
      closeRenderedThread();
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest(".rendered-comment-marker")
    ) {
      event.preventDefault();
      openRenderedComment(block);
      return;
    }
    if (isInteractiveRenderedCommentTarget(event.target)) return;
    if (window.getSelection()?.toString().trim()) return;
    if (openRenderedComment(block)) return;

    startRenderedComment(block);
  };

  const renderedThreadComments = renderedThreadTarget
    ? commentsForRenderedTarget(
        markdownRef.current,
        renderedThreadTarget,
        comments,
      )
    : [];
  const renderedThread = renderedThreadTarget
    ? renderedThreadModel(
        file.path,
        renderedThreadTarget.draft,
        renderedThreadComments,
      )
    : null;

  return (
    <section className="document-viewer">
      <div className="viewer-toolbar">
        <strong>{file.path}</strong>
        <div className="viewer-toolbar-actions">
          <div className="segmented-control" aria-label="Markdown view mode">
            <button
              className={mode === "rendered" ? "active" : ""}
              type="button"
              onClick={() => setMode("rendered")}
            >
              Rendered
            </button>
            <button
              className={mode === "source" ? "active" : ""}
              type="button"
              onClick={() => setMode("source")}
            >
              Source
            </button>
          </div>
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
      {diffEnabled ? (
        <DiffViewer
          path={file.path}
          diff={diff ?? null}
          loading={diffLoading}
          focusChanges={diffFocusChanges}
          renderKind={mode === "source" ? "source" : "markdown"}
          theme={theme}
          onFocusChangesChange={onDiffFocusChange}
          onCreateComment={onCreateComment}
          file={file}
          comments={comments}
          activeCommentId={activeCommentId}
          onOpenComment={onOpenComment}
        />
      ) : mode === "rendered" ? (
        <article
          className="markdown markdown-document"
          ref={markdownRef}
          onMouseUp={() =>
            scheduleSelectionCommentUpdate(updateRenderedSelectionComment)
          }
          onKeyUp={updateRenderedSelectionComment}
          onClick={onRenderedClick}
        />
      ) : (
        <SourceCommentSurface
          file={file}
          className="markdown-source"
          selectedRange={sourceSelectedRange}
          comments={comments}
          activeCommentId={activeCommentId}
          onSelectionChange={setSourceSelectedRange}
          onCreateComment={onCreateComment}
          onOpenComment={onOpenComment}
          onCloseComment={onCloseComment}
          onCommentStatusChange={onCommentStatusChange}
        />
      )}
      {renderedThread && renderedThreadTarget
        ? createPortal(
            <CodeCommentThread
              className="rendered-comment-thread"
              thread={renderedThread}
              draft={renderedThreadTarget.draft}
              onCreateComment={onCreateComment}
              onStatusChange={onCommentStatusChange}
              onClose={closeRenderedThread}
            />,
            renderedThreadTarget.mount,
          )
        : null}
    </section>
  );
}

interface DOMRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function renderMarkdownDocumentHtml(
  markdown: string,
  options: { commentBlocks?: boolean } = {},
): string {
  const frontMatter = parseMarkdownFrontMatter(markdown);
  const body = frontMatter.status === "none" ? markdown : frontMatter.body;
  const renderedBody =
    options.commentBlocks === false
      ? (marked.parse(injectMermaidPreviewBlocks(body)) as string)
      : renderMarkdownHtmlWithSourceRanges(
          body,
          markdownBodyLineOffset(markdown),
        );
  const html = renderMarkdownHtmlWithHeadingIds(
    renderedBody,
    extractMarkdownOutline(body),
  );
  const metadataHtml =
    frontMatter.status === "none" ? "" : renderFrontMatterPanel(frontMatter);
  const bodyHtml = enhanceMarkdownHtml(html);
  return (
    metadataHtml +
    (options.commentBlocks === false
      ? bodyHtml
      : addRenderedCommentBlockIdsToHtml(bodyHtml, {
          preserveSourceRanges: true,
        }))
  );
}

function sourceRangeForTarget(target: {
  sourceLineStart?: number;
  sourceLineEnd?: number;
}): LineRange | null {
  if (!target.sourceLineStart) return null;
  return {
    start: target.sourceLineStart,
    end: target.sourceLineEnd ?? target.sourceLineStart,
  };
}

function createRenderedThreadHost(block: HTMLElement): {
  host: HTMLElement;
  mount: HTMLElement;
} {
  if (block.localName === "tr") {
    const host = document.createElement("tr");
    host.className = "rendered-comment-thread-table-row";
    const mount = document.createElement("td");
    mount.className = "rendered-comment-thread-host";
    mount.colSpan = Math.max(1, block.children.length);
    host.append(mount);
    return { host, mount };
  }

  const host = document.createElement("div");
  host.className = "rendered-comment-thread-host";
  return { host, mount: host };
}

function placeRenderedThreadHost(block: HTMLElement, host: HTMLElement): void {
  if (block.localName === "li") {
    if (host.parentElement !== block) block.append(host);
    return;
  }
  if (block.nextElementSibling !== host) block.after(host);
}

function commentsForRenderedTarget(
  root: HTMLElement | null,
  target: { blockIds: string[]; draft: CommentDraft },
  comments: ViviComment[],
): ViviComment[] {
  if (!root) return [];
  const targetStart = target.draft.anchor.canonical.lineStart;
  const targetEnd =
    target.draft.anchor.canonical.lineEnd ??
    target.draft.anchor.canonical.lineStart;
  const targetBlockIds = new Set(target.blockIds);
  return comments
    .filter((comment) => {
      const summary = renderedCommentSummaryForComment(comment, "markdown");
      const lineStart = comment.anchor.canonical.lineStart;
      const lineEnd =
        comment.anchor.canonical.lineEnd ?? comment.anchor.canonical.lineStart;
      if (
        targetStart !== undefined &&
        targetEnd !== undefined &&
        lineStart !== undefined &&
        lineEnd !== undefined
      ) {
        return lineStart === targetStart && lineEnd === targetEnd;
      }
      return Boolean(
        summary &&
        findBlocksForRenderedComment(root, summary).some((block) =>
          targetBlockIds.has(block.dataset.viviCommentBlockId ?? ""),
        ),
      );
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function renderedThreadModel(
  path: string,
  draft: CommentDraft,
  comments: ViviComment[],
): CodeCommentThreadModel {
  const lineStart = draft.anchor.canonical.lineStart ?? 1;
  const lineEnd = draft.anchor.canonical.lineEnd ?? lineStart;
  return {
    key: JSON.stringify([path, lineStart, lineEnd]),
    path,
    lineStart,
    lineEnd,
    comments,
  };
}

export function injectMermaidPreviewBlocks(markdown: string): string {
  let index = 0;
  return markdown.replace(
    /```(?:mermaid|mmd)\s*\n([\s\S]*?)```/gi,
    (_match, diagram: string) => {
      const source = `<details class="markdown-mermaid-source"><summary>Mermaid source</summary><pre><code>${escapeHtml(diagram.trim())}</code></pre></details>`;
      const sourceAttribute = escapeAttribute(diagram.trim());
      index += 1;
      return `<figure class="markdown-mermaid" data-mermaid-status="pending" data-mermaid-source="${sourceAttribute}"><figcaption>Mermaid preview · strict security</figcaption><div class="mermaid-render-target"></div><div class="markdown-mermaid-fallback unsupported"><p>Mermaid preview is loading. Source is shown below if rendering fails.</p>${source}</div></figure>`;
    },
  );
}

function enhanceMarkdownHtml(html: string): string {
  return wrapTables(renderGitHubAlerts(html));
}

function wrapTables(html: string): string {
  return html.replace(
    /<table>([\s\S]*?)<\/table>/g,
    '<div class="markdown-table-wrap"><table>$1</table></div>',
  );
}

function renderGitHubAlerts(html: string): string {
  return html.replace(
    /<blockquote(\s[^>]*)?>\s*<p(?:\s[^>]*)?>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\n)?([\s\S]*?)<\/blockquote>/g,
    (_match, rawAttributes = "", rawKind: string, rawBody: string) => {
      const kind = rawKind.toLowerCase();
      const label = alertLabelForKind(kind);
      const body = rawBody
        .trim()
        .replace(/^<\/p>\s*/i, "")
        .trim();
      const bodyHtml = alertBodyHtml(body);
      return `<aside class="markdown-callout ${kind}"${rawAttributes}><p class="markdown-callout-title">${label}</p>${bodyHtml}</aside>`;
    },
  );
}

function renderFrontMatterPanel(
  frontMatter: Exclude<
    ReturnType<typeof parseMarkdownFrontMatter>,
    { status: "none" }
  >,
): string {
  if (frontMatter.status === "invalid") {
    return `<aside class="markdown-frontmatter invalid" aria-label="Front matter metadata"><div class="markdown-frontmatter-heading"><span>Metadata</span><small>Could not parse</small></div><p class="markdown-frontmatter-warning">${escapeHtml(frontMatter.error)}</p><pre>${escapeHtml(frontMatter.raw.trim())}</pre></aside>`;
  }

  const rows =
    frontMatter.entries.length > 0
      ? frontMatter.entries.map(renderFrontMatterEntry).join("")
      : '<div class="markdown-frontmatter-empty">No metadata values.</div>';
  return `<aside class="markdown-frontmatter" aria-label="Front matter metadata"><div class="markdown-frontmatter-heading"><span>Metadata</span></div><dl>${rows}</dl></aside>`;
}

function renderFrontMatterEntry(entry: FrontMatterEntry): string {
  return `<div class="markdown-frontmatter-row"><dt>${escapeHtml(entry.key)}</dt><dd>${renderFrontMatterValue(entry.value)}</dd></div>`;
}

function renderFrontMatterValue(value: FrontMatterValue): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="frontmatter-muted">[]</span>';
    return `<div class="frontmatter-list">${value
      .map((item) => `<span>${renderFrontMatterValue(item)}</span>`)
      .join("")}</div>`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0)
      return '<span class="frontmatter-muted">{}</span>';
    return `<dl class="frontmatter-nested">${entries
      .map(
        ([key, nestedValue]) =>
          `<div><dt>${escapeHtml(key)}</dt><dd>${renderFrontMatterValue(nestedValue)}</dd></div>`,
      )
      .join("")}</dl>`;
  }
  if (typeof value === "boolean") {
    return `<code class="frontmatter-boolean">${String(value)}</code>`;
  }
  if (value === null) return '<span class="frontmatter-muted">null</span>';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(text)) {
    return `<time>${escapeHtml(text)}</time>`;
  }
  return escapeHtml(text);
}

function alertBodyHtml(body: string): string {
  if (!body) return "";
  if (body.startsWith("<")) return body;
  return body.endsWith("</p>") ? `<p>${body}` : `<p>${body}</p>`;
}

function alertLabelForKind(kind: string): string {
  if (kind === "tip") return "Tip";
  if (kind === "important") return "Important";
  if (kind === "warning") return "Warning";
  if (kind === "caution") return "Caution";
  return "Note";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
