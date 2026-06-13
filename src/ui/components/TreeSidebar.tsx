import { useState } from "react";
import type { FsNode } from "../../domain/fs-node.js";
import { iconForPath } from "../state/file-icons.js";

interface Props {
  nodes: FsNode[];
  selectedPath: string | null;
  changedPaths?: Set<string>;
  removedPaths?: Set<string>;
  onSelect: (path: string) => void;
}

export function TreeSidebar({
  nodes,
  selectedPath,
  changedPaths = new Set(),
  removedPaths = new Set(),
  onSelect,
}: Props) {
  return (
    <div className="tree">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          changedPaths={changedPaths}
          removedPaths={removedPaths}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  selectedPath,
  changedPaths,
  removedPaths,
  onSelect,
}: {
  node: FsNode;
  selectedPath: string | null;
  changedPaths: Set<string>;
  removedPaths: Set<string>;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  if (node.kind === "directory") {
    return (
      <div className="tree-node">
        <button
          className="tree-row dir"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="tree-twisty">{expanded ? "▾" : "▸"}</span>
          <span className="file-icon">📁</span>
          <span>{node.name}</span>
        </button>
        {expanded && (
          <div className="tree-children">
            {node.children?.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                changedPaths={changedPaths}
                removedPaths={removedPaths}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      data-tree-path={node.path}
      className={[
        "tree-row file",
        node.path === selectedPath ? "selected" : "",
        changedPaths.has(node.path) ? "changed" : "",
        removedPaths.has(node.path) ? "removed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(node.path)}
    >
      <span className="tree-twisty" />
      <span className="file-icon">
        {iconForPath(node.path, node.viewerKind)}
      </span>
      <span>{node.name}</span>
      {changedPaths.has(node.path) ? (
        <span className="tree-badge">changed</span>
      ) : null}
    </button>
  );
}
