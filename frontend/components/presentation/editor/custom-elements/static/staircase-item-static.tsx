import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { type TStairGroupElement } from "../../plugins/staircase-plugin";

export function StairItemStatic(props: PlateElementProps) {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const parentPath = PathApi.parent(path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TStairGroupElement;

  const totalItems =
    parentElement?.totalChildren || parentElement?.children?.length || 1;
  const index = (path?.at(-1) as number) ?? 0;

  const baseWidth = 70;
  const maxWidth = 220;
  const increment = (maxWidth - baseWidth) / (totalItems - 1 || 1);
  const widthPx = baseWidth + index * increment;

  return (
    <div className={cn("group/stair-item relative mb-2 w-full")}>
      <div className="flex items-center gap-4 border-b border-gray-700">
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
        <PlateElement className="flex flex-1 items-center" {...props}>
          {props.children}
        </PlateElement>
      </div>
    </div>
  );
}
