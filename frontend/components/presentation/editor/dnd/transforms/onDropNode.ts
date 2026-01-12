import { type PlateEditor } from "platejs/react";
import { type DropTargetMonitor } from "react-dnd";

import { insertColumnGroup } from "@platejs/layout";
import { type TElement } from "platejs";

import { type ElementDragItemNode } from "@platejs/dnd";
import { type UseDropNodeOptions } from "../hooks";

import { MultiDndPlugin } from "@/components/plate/plugins/dnd-kit";
import { getDropPath } from "../utils/getDropPath";
import { updateSiblingsAfterDrop } from "../utils/updateSiblingsForcefully";

export const onDropNode = (
  editor: PlateEditor,
  {
    canDropNode,
    dragItem,
    element,
    monitor,
    nodeRef,
  }: {
    dragItem: ElementDragItemNode;
    monitor: DropTargetMonitor;
  } & Pick<UseDropNodeOptions, "canDropNode" | "element" | "nodeRef">,
) => {
  const { orientation } = editor.getOptions(MultiDndPlugin);
  const result = getDropPath(editor, {
    canDropNode,
    dragItem,
    element,
    monitor,
    nodeRef,
  });

  if (!result) return;

  if (orientation) {
    const result = getDropPath(editor, {
      canDropNode,
      dragItem,
      element,
      monitor,
      nodeRef,
    });

    if (!result) return;

    const { dragPath, to } = result;

    if (!to) return;
    // Check if we're dragging multiple nodes
    const draggedIds = Array.isArray(dragItem.id) ? dragItem.id : [dragItem.id];

    if (draggedIds.length > 1) {
      // Handle multi-node drop - get elements by their IDs and sort them
      const elements: TElement[] = [];

      draggedIds.forEach((id) => {
        const entry = editor.api.node<TElement>({ id, at: [] });
        if (entry) {
          elements.push(entry[0]);
        }
      });

      editor.tf.withoutNormalizing(() => {
        editor.tf.moveNodes({
          at: [],
          to,
          match: (n) => elements.some((element) => element.id === n.id),
        });

        // Update siblings for dropped elements that require it
        elements.forEach((element) => {
          if (element?.type) {
            updateSiblingsAfterDrop(editor, element, to);
          }
        });
      });
    } else {
      // Single node drop
      editor.tf.withoutNormalizing(() => {
        editor.tf.moveNodes({
          at: dragPath,
          to,
        });

        // Update siblings for dropped element that requires it
        const droppedElement = editor.api.node<TElement>({ at: to });
        if (droppedElement?.[0]?.type) {
          updateSiblingsAfterDrop(editor, droppedElement[0], to);
        }
      });
    }

    return;
  }

  const { direction, dragPath, to, hoveredPath, isExternalNode } = result;
  // Check if we're dragging multiple nodes
  const draggedIds = Array.isArray(dragItem.id) ? dragItem.id : [dragItem.id];

  // Handle horizontal drops (create columns)
  if (direction === "left" || direction === "right") {
    if (!hoveredPath) return;

    // Check if we should create columns or just move elements
    // Only create columns if:
    // 1. The hovered element is at root level (path length is 1), OR
    // 2. It's an external node, OR
    // 3. We're dragging multiple elements
    const shouldCreateColumns =
      hoveredPath.length === 1 || isExternalNode || draggedIds.length > 1;

    if (!shouldCreateColumns) {
      // Don't create columns - just move the element to the target position
      if (!to) return;

      const draggedElementIds = new Set(draggedIds);

      editor.tf.withoutNormalizing(() => {
        editor.tf.moveNodes({
          at: [],
          to,
          match: (n) => draggedElementIds.has(n.id as string),
        });
      });

      // Update siblings for dropped elements that require it
      draggedElementIds.forEach((id) => {
        const entry = editor.api.node<TElement>({ id, at: [] });
        console.log("Entry:", entry);
        if (entry?.[0].type) {
          updateSiblingsAfterDrop(editor, entry[0], to);
        }
      });
      return;
    }

    // Store the target element ID before any modifications
    const targetElementId = element.id as string;

    // Collect all dragged element IDs for matching
    const draggedElementIds = new Set(draggedIds);

    // Create a column group with 2 columns at the hovered position
    insertColumnGroup(editor, {
      columns: 2,
      at: hoveredPath,
    });

    // Get the paths of the two column items that were just created
    const columnGroupPath = hoveredPath;
    const firstColumnPath = [...columnGroupPath, 0];
    const secondColumnPath = [...columnGroupPath, 1];

    // Determine which column gets which content based on direction
    const targetColumnPath =
      direction === "left" ? secondColumnPath : firstColumnPath;
    const draggedColumnPath =
      direction === "left" ? firstColumnPath : secondColumnPath;

    // Use a transaction to ensure all operations complete
    editor.transforms.withoutNormalizing(() => {
      // First, move the target element into its column
      // The target element is now at the next path because insertColumnGroup pushed it down
      editor.tf.moveNodes({
        at: [],
        to: [...targetColumnPath, 0],
        match: (n) => n.id === targetElementId,
      });

      if (
        isExternalNode &&
        dragItem.element &&
        typeof dragItem.element === "object"
      ) {
        // Handle external node insertion
        if (Array.isArray(dragItem.element)) {
          // Multiple external elements
          dragItem.element.forEach((elem, index) => {
            editor.tf.insertNodes(elem, {
              at: [...draggedColumnPath, index],
            });
          });
        } else {
          // Single external element
          editor.tf.insertNodes(dragItem.element as TElement, {
            at: [...draggedColumnPath, 0],
          });
        }
      } else {
        // Move all dragged nodes into the dragged column at once
        // First, collect all the nodes that need to be moved
        const nodesToMove: TElement[] = [];
        draggedElementIds.forEach((id) => {
          const entry = editor.api.node<TElement>({ id, at: [] });
          if (entry) {
            nodesToMove.push(entry[0]);
          }
        });

        // Move all nodes at once using match
        if (nodesToMove.length > 0) {
          editor.tf.moveNodes({
            at: [],
            to: [...draggedColumnPath, 0],
            match: (n) => draggedElementIds.has(n.id as string),
          });
        }
      }

      // Update siblings for dropped elements that require it
      draggedElementIds.forEach((id) => {
        const entry = editor.api.node<TElement>({ id });
        console.log("Entry:", entry);
        if (entry?.[0]?.type) {
          updateSiblingsAfterDrop(editor, entry[0], [...draggedColumnPath, 0]);
        }
      });
    });

    return;
  }

  // Handle vertical drops (reordering)
  if (!to) return;

  if (draggedIds.length > 1) {
    // Handle multi-node drop for vertical reordering
    const draggedElementIds = new Set(draggedIds);

    editor.tf.moveNodes({
      at: [],
      to,
      match: (n) => draggedElementIds.has(n.id as string),
    });

    // Update siblings for dropped elements that require it
    draggedElementIds.forEach((id) => {
      const entry = editor.api.node<TElement>({ id });
      if (entry?.[0].type) {
        updateSiblingsAfterDrop(editor, entry[0], to);
      }
    });
  } else if (
    isExternalNode &&
    dragItem.element &&
    typeof dragItem.element === "object"
  ) {
    // External node - insert at position
    editor.tf.insertNodes(dragItem.element as TElement, {
      at: to,
    });
  } else if (dragPath) {
    // Single node drop - standard move
    editor.tf.moveNodes({
      at: dragPath,
      to,
    });
    // Update siblings for dropped element that requires it
    const droppedElement = editor.api.node<TElement>(to);
    if (droppedElement?.[0].type) {
      updateSiblingsAfterDrop(editor, droppedElement[0], to);
    }
  }
};
