"use client";

import { DndPlugin } from "@platejs/dnd";
import { PlaceholderPlugin } from "@platejs/media/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { BlockDraggable } from "@/components/plate/ui/block-draggable";

export const MultiDndPlugin = DndPlugin.extend({
  options: {
    orientation: undefined,
    isMouseDown: false,
  } as {
    orientation: "vertical" | "horizontal" | undefined;
    isMouseDown: boolean;
  },
});

export const DndKit = [
  MultiDndPlugin.configure({
    options: {
      enableScroller: true,
      onDropFiles: ({ dragItem, editor, target }) => {
        editor
          .getTransforms(PlaceholderPlugin)
          .insert.media(dragItem.files, { at: target, nextBlock: false });
      },
    },
    render: {
      aboveNodes: BlockDraggable,
    },
  }),
];
