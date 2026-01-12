"use client";

import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import {
  type TStairGroupElement,
  type TStairItemElement,
} from "../plugins/staircase-plugin";

// StairItem component aligned with PyramidItem behavior
export const StairItem = (props: PlateElementProps<TStairItemElement>) => {
  // Derive parent stair element and totalChildren like pyramid
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TStairGroupElement;

  const totalItems = parentElement?.children?.length || 1;
  const index = props.path.at(-1) ?? 0;

  // Calculate a width ramp similar to previous design, but driven by totalItems
  const baseWidth = 70;
  const maxWidth = 220;
  const increment = (maxWidth - baseWidth) / (totalItems - 1 || 1);
  const widthPx = baseWidth + index * increment;

  return (
    <div className={cn("group/stair-item relative mb-2 w-full")}>
      <div className="flex items-center gap-4 border-b border-gray-700">
        {/* Width-growing block with number */}
        <div
          style={{
            width: `${widthPx}px`,
            minHeight: "70px",
            backgroundColor:
              (parentElement?.color as string) || "var(--presentation-primary)",
            color: "var(--presentation-background)",
          }}
          className="flex flex-shrink-0 items-center justify-center rounded-md text-2xl font-bold"
        >
          {index + 1}
        </div>
        {/* Content area */}

        <PlateElement className="flex flex-1 items-center" {...props}>
          {props.children}
        </PlateElement>
      </div>
    </div>
  );
};
