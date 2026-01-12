"use client";

import { cn } from "@/lib/utils";
import { NodeApi, PathApi, type TElement } from "platejs";
import {
  PlateElement,
  type PlateEditor,
  type StyledPlateElementProps,
} from "platejs/react";
import { type TCycleItemElement } from "../plugins/cycle-plugin";

// CycleItem component for individual items in the cycle
export const CycleItem = (
  props: StyledPlateElementProps<TCycleItemElement>,
) => {
  const index = props.path.at(-1) as number;

  // Calculate item color based on index
  const getItemColor = () => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-indigo-500",
      "bg-pink-500",
    ];
    return colors[index % colors.length];
  };
  const gridClass = getCycleItemGridClass(
    props.editor,
    props.element as TElement,
    props.path,
  );

  return (
    <div className={cn(gridClass)}>
      <div className={cn("group/cycle-item relative mb-6")}>
        {/* Drop target indicator lines */}
        {/* Content container with heading */}
        <div className="rounded-md border border-primary/20 bg-card p-4 shadow-sm">
          {/* Heading with number */}
          <div className="mb-2 flex items-center">
            <div
              className={cn(
                "mr-3 flex h-8 w-8 items-center justify-center rounded-full text-white",
                getItemColor(),
              )}
            >
              {index + 1}
            </div>
          </div>

          {/* Content area */}
          <PlateElement className="mt-2" {...props}>
            {props.children}
          </PlateElement>
        </div>
      </div>
    </div>
  );
};

// Compute grid placement class for a cycle item given editor context
export function getCycleItemGridClass(
  editor: PlateEditor,
  element: TElement,
  path: number[],
): string {
  try {
    if (element.type !== "cycle-item") return "";
    const parentPath = PathApi.parent(path);
    const parent = NodeApi.get(editor, parentPath) as {
      children?: unknown[];
    } | null;
    const totalChildren =
      (parent?.children as unknown[] | undefined)?.length ?? 0;
    const hasOddItems = totalChildren % 2 !== 0;
    const index = path.at(-1) as number;

    let columnStart: string;
    if (hasOddItems && index === 0) {
      columnStart = "col-start-2";
    } else {
      const adjustedIndex = hasOddItems ? index - 1 : index;
      columnStart = adjustedIndex % 2 === 0 ? "col-start-1" : "col-start-3";
    }

    return cn("col-span-1", columnStart);
  } catch {
    return "";
  }
}
