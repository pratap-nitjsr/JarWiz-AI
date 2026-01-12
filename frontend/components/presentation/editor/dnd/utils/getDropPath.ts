import { type PlateEditor } from "platejs/react";
import { type DropTargetMonitor } from "react-dnd";

import { type NodeEntry, type Path, type TElement, PathApi } from "platejs";

import { MultiDndPlugin } from "@/components/plate/plugins/dnd-kit";
import { type DragItemNode } from "@platejs/dnd";
import { type UseDropNodeOptions } from "../hooks";
import { getHoverDirection } from "./getHoverDirection";

/**
 * Callback called on drag and drop a node with id.
 * Returns the drop path and direction for both vertical and horizontal drops.
 */
export const getDropPath = (
  editor: PlateEditor,
  {
    canDropNode,
    dragItem,
    element,
    monitor,
    nodeRef,
  }: {
    dragItem: DragItemNode;
    monitor: DropTargetMonitor;
  } & Pick<UseDropNodeOptions, "canDropNode" | "element" | "nodeRef">,
) => {
  const { orientation } = editor.getOptions(MultiDndPlugin);
  // Get direction without orientation constraint for multi-directional support
  const direction = getHoverDirection({
    dragItem,
    element,
    monitor,
    nodeRef,
    orientation,
  });

  if (!direction) return;

  let dragEntry: NodeEntry<TElement> | undefined;
  let dropEntry: NodeEntry<TElement> | undefined;

  if ("element" in dragItem) {
    const dragPath = editor.api.findPath(dragItem.element);
    const hoveredPath = editor.api.findPath(element);

    if (!hoveredPath) return;

    // If dragPath is found, we're moving an existing node
    // If not, we're inserting a new node (e.g., from external source)
    if (dragPath) {
      dragEntry = [dragItem.element, dragPath];
    }

    dropEntry = [element, hoveredPath];
  } else {
    dropEntry = editor.api.node<TElement>({ id: element.id as string, at: [] });
  }

  if (!dropEntry) return;

  // Only check canDropNode if we have a dragEntry (for existing nodes)
  if (
    canDropNode &&
    dragEntry &&
    !canDropNode({ dragEntry, dragItem, dropEntry, editor })
  ) {
    return;
  }

  const dragPath = dragEntry?.[1];
  const hoveredPath = dropEntry[1];

  // For left/right direction, return early since we'll handle column creation
  if (direction === "left" || direction === "right") {
    // Include isExternalNode flag if dragPath is not available
    return {
      direction,
      dragPath,
      hoveredPath,
      to: hoveredPath,
      isExternalNode: !dragPath,
    };
  }

  // Handle top/bottom drops for vertical reordering
  let dropPath: Path | undefined;

  if (direction === "bottom") {
    // Insert after hovered node
    dropPath = hoveredPath;

    // If the dragged node is already right after hovered node, no change
    if (dragPath && PathApi.equals(dragPath, PathApi.next(dropPath))) return;
  }

  if (direction === "top") {
    // Insert before hovered node
    dropPath = [...hoveredPath.slice(0, -1), hoveredPath.at(-1)! - 1];

    // If the dragged node is already right before hovered node, no change
    if (dragPath && PathApi.equals(dragPath, dropPath)) return;
  }

  if (!dropPath) return;

  const before =
    dragPath &&
    PathApi.isBefore(dragPath, dropPath) &&
    PathApi.isSibling(dragPath, dropPath);
  const to = before ? dropPath : PathApi.next(dropPath);

  // Include isExternalNode flag if dragPath is not available
  return {
    direction,
    dragPath,
    to,
    hoveredPath,
    isExternalNode: !dragPath,
  };
};
