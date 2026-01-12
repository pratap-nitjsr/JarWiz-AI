import { MultiDndPlugin } from "@/components/plate/plugins/dnd-kit";
import { type DragItemNode } from "@platejs/dnd";
import { type TElement } from "platejs";
import { type PlateEditor } from "platejs/react";
import React from "react";
import {
  type ConnectDragPreview,
  type ConnectDragSource,
  type DragSourceHookSpec,
  useDrag,
} from "react-dnd";

export interface UseDragNodeOptions
  extends DragSourceHookSpec<DragItemNode, unknown, { isDragging: boolean }> {
  element: TElement;
  orientation?: "vertical" | "horizontal";
}

/**
 * `useDrag` hook to drag a node from the editor. `item` with `id` is required.
 */
export const useDragNode = (
  editor: PlateEditor,
  { element: staleElement, item, orientation, ...options }: UseDragNodeOptions,
): [
  { isAboutToDrag: boolean; isDragging: boolean },
  ConnectDragSource,
  ConnectDragPreview,
] => {
  const elementId = staleElement.id as string;
  const [isAboutToDrag, setIsAboutToDrag] = React.useState(false);

  const [collected, dragRef, preview] = useDrag<
    DragItemNode,
    unknown,
    { isDragging: boolean }
  >(
    () => ({
      canDrag: () => {
        setIsAboutToDrag(true);
        return true;
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: () => {
        editor.setOption(MultiDndPlugin, "isDragging", false);
        document.body.classList.remove("dragging");
        setIsAboutToDrag(false);
      },
      item(monitor) {
        editor.setOption(MultiDndPlugin, "isDragging", true);
        editor.setOption(MultiDndPlugin, "orientation", orientation);
        editor.setOption(MultiDndPlugin, "_isOver", true);
        document.body.classList.add("dragging");

        const _item = typeof item === "function" ? item(monitor) : item;

        const currentDraggingId = editor.getOption(
          MultiDndPlugin,
          "draggingId",
        );
        let id: string[] | string;

        if (
          Array.isArray(currentDraggingId) &&
          currentDraggingId.length > 1 &&
          currentDraggingId.includes(elementId)
        ) {
          id = Array.from(currentDraggingId);
        } else {
          id = elementId;
          editor.setOption(MultiDndPlugin, "draggingId", elementId);
        }

        return {
          id,
          editorId: editor.id,
          element: staleElement,
          ..._item,
        };
      },
      ...options,
    }),
    [editor, elementId],
  );

  React.useEffect(() => {
    if (!collected.isDragging && isAboutToDrag) {
      setIsAboutToDrag(false);
    }
  }, [collected.isDragging, isAboutToDrag]);

  return [{ ...collected, isAboutToDrag }, dragRef, preview];
};
