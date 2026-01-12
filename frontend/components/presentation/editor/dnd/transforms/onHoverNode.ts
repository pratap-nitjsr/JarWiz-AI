import { type PlateEditor } from "platejs/react";
import { type DropTargetMonitor } from "react-dnd";

import { NodeApi, PathApi } from "platejs";

import { type DragItemNode } from "@platejs/dnd";
import { type UseDropNodeOptions } from "../hooks/useDropNode";

import { MultiDndPlugin } from "@/components/plate/plugins/dnd-kit";
import { getDropPath } from "../utils/getDropPath";

/**
 * Callback called when dragging a node and hovering nodes.
 * Supports multi-directional dragging without orientation constraint.
 */
export const onHoverNode = (
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
  const { _isOver, dropTarget } = editor.getOptions(MultiDndPlugin);
  const currentId = dropTarget?.id ?? null;
  const currentLine = dropTarget?.line ?? "";

  // Check if the drop would actually move the node
  const result = getDropPath(editor, {
    canDropNode,
    dragItem,
    element,
    monitor,
    nodeRef,
  });

  // If getDropPath returns undefined, it means no actual move would happen
  if (!result) {
    if (currentId || currentLine) {
      editor.setOption(MultiDndPlugin, "dropTarget", { id: null, line: "" });
    }
    return;
  }

  const { direction } = result;
  const newDropTarget = { id: element.id as string, line: direction };

  if (newDropTarget.id !== currentId || newDropTarget.line !== currentLine) {
    // Only set if there's a real change
    if (!_isOver) {
      return;
    }

    // For top positioning, adjust to show line at bottom of previous element
    if (newDropTarget.line === "top") {
      const previousPath = PathApi.previous(editor.api.findPath(element)!);

      if (!previousPath) {
        return editor.setOption(MultiDndPlugin, "dropTarget", newDropTarget);
      }

      const nextNode = NodeApi.get(editor, previousPath!);

      editor.setOption(MultiDndPlugin, "dropTarget", {
        id: nextNode?.id as string,
        line: "bottom",
      });

      return;
    }

    editor.setOption(MultiDndPlugin, "dropTarget", newDropTarget);
  }

  // Collapse selection if expanded during drag
  if (direction && editor.api.isExpanded()) {
    editor.tf.focus();
    editor.tf.collapse();
  }
};
