/** biome-ignore-all lint/suspicious/noExplicitAny: This use requires any */
import { type TElement } from "platejs";
import { type DropTargetMonitor, type XYCoord } from "react-dnd";

import {
  type DragItemNode,
  type DropDirection,
  type ElementDragItemNode,
} from "@platejs/dnd";

export interface GetHoverDirectionOptions {
  dragItem: DragItemNode;

  /** Hovering node. */
  element: TElement;

  monitor: DropTargetMonitor;

  /** The node ref of the node being dragged. */
  nodeRef: any;

  orientation?: "vertical" | "horizontal";
  /** Removed orientation parameter to support multi-directional */
}

/**
 * If dragging a node A over another node B: get the direction of node A
 * relative to node B based on mouse position.
 *
 * This version uses a hybrid threshold system:
 * - 'left': The first 30px of the element.
 * - 'right': 30px past the horizontal center of the element.
 * - 'top'/'bottom': The area between the left and right zones.
 */
export const getHoverDirection = ({
  dragItem,
  element,
  monitor,
  nodeRef,
  orientation: _,
}: GetHoverDirectionOptions): DropDirection => {
  if (!nodeRef.current) return;

  // Don't replace items with themselves
  if (element === (dragItem as ElementDragItemNode).element) return;

  // For multiple node drag, don't show drop line if hovering over any selected element
  const elementDragItem = dragItem as ElementDragItemNode;
  const draggedIds = Array.isArray(elementDragItem.id)
    ? elementDragItem.id
    : [elementDragItem.id];
  if (draggedIds.includes(element.id as string)) return;

  const HORIZONTAL_THRESHOLD = 40;

  const hoverBoundingRect = nodeRef.current?.getBoundingClientRect();
  if (!hoverBoundingRect) return;

  const clientOffset = monitor.getClientOffset();
  if (!clientOffset) return;

  // if (orientation === "vertical") {
  //   const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

  //   const hoverMiddleY = hoverBoundingRect.height / 2;
  //   return hoverClientY < hoverMiddleY ? "top" : "bottom";
  // } else if (orientation === "horizontal") {
  //   const hoverClientX = (clientOffset as XYCoord).x - hoverBoundingRect.left;

  //   if (hoverClientX < HORIZONTAL_THRESHOLD) {
  //     return "left";
  //   }

  //   // 2. Check for 'right': This is the new calculation.
  //   const hoverMiddleX = (hoverBoundingRect.left + hoverBoundingRect.width) / 2;
  //   // The 'right' zone starts at the center point PLUS the threshold.
  //   if (hoverClientX > hoverMiddleX + HORIZONTAL_THRESHOLD) {
  //     return "right";
  //   }
  // } else {
  // Multi directional dnd support
  const hoverClientX = (clientOffset as XYCoord).x - hoverBoundingRect.left;
  const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

  if (hoverClientX < HORIZONTAL_THRESHOLD) {
    return "left";
  }

  // 2. Check for 'right': This is the new calculation.
  const hoverMiddleX = (hoverBoundingRect.left + hoverBoundingRect.width) / 2;
  // The 'right' zone starts at the center point PLUS the threshold.
  if (hoverClientX > hoverMiddleX + HORIZONTAL_THRESHOLD) {
    return "right";
  }

  // 3. Fallback: If not in the left or right zones, calculate vertically.
  const hoverMiddleY = hoverBoundingRect.height / 2;
  return hoverClientY < hoverMiddleY ? "top" : "bottom";
  // }
};
