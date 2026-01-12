"use client";

import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TBulletItemElement } from "../plugins/bullet-plugin";

// BulletItem component for numbered blocks with content
export const BulletItem = (props: PlateElementProps<TBulletItemElement>) => {
  const index = props.path.at(-1) as number;

  // Get parent element for color
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(props.editor, parentPath);

  // Force sibling refresh when index changes
  return (
    <div className={cn("group/bullet-item relative")}>
      {/* The bullet item layout with numbered block and content */}
      <div className="flex items-start">
        {/* Numbered square/block */}
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-primary text-xl font-bold text-primary-foreground"
          style={{
            backgroundColor:
              (parentElement?.color as string) || "var(--presentation-primary)",
            color: "var(--presentation-background)",
          }}
        >
          {index + 1}
        </div>

        <PlateElement className="ml-4 flex-1" {...props}>
          {props.children}
        </PlateElement>
      </div>
    </div>
  );
};
