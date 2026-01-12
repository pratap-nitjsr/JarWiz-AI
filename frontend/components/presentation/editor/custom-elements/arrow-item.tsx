"use client";

import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { type TArrowListItemElement } from "../plugins/arrow-plugin";

// ArrowItem component for individual items in the arrow visualization
export const ArrowItem = (props: PlateElementProps<TArrowListItemElement>) => {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const parentPath = PathApi.parent(path);
  const parentElement = NodeApi.get(props.editor, parentPath);

  return (
    <div className={cn("group/arrow-item relative mb-2 ml-4 flex gap-6")}>
      {/* Chevron icon column */}
      <div className="flex h-full basis-24 shrink-0 items-center justify-center">
        <svg className="relative -top-4 z-50 aspect-square overflow-visible">
          <path
            d="M0,90L45,108L90,90L90,0L45,18L0,0Z"
            style={{
              fill:
                (parentElement?.color as string) ||
                "var(--presentation-primary)",
            }}
          ></path>
        </svg>
      </div>

      {/* Content column */}
      <PlateElement {...props}>{props.children}</PlateElement>
    </div>
  );
};
