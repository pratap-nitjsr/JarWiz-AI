import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { type TPyramidGroupElement } from "../../plugins/pyramid-plugin";

export function PyramidItemStatic(props: PlateElementProps) {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const parentPath = PathApi.parent(path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TPyramidGroupElement;

  const totalItems =
    parentElement?.totalChildren || parentElement?.children?.length || 1;
  const index = (path?.at(-1) as number) ?? 0;

  const shapeHeight = 80;
  const maxWidthPercentage = 80;
  const increment = maxWidthPercentage / (2 * totalItems);

  const calculateClipPath = () => {
    if (index === 0) {
      return `polygon(50% 0%, ${50 - increment}% 100%, ${50 + increment}% 100%)`;
    } else {
      const prevXOffset = increment * index;
      const currentXOffset = increment * (index + 1);
      const prevBottomLeft = 50 - prevXOffset;
      const prevBottomRight = 50 + prevXOffset;
      const currentBottomLeft = 50 - currentXOffset;
      const currentBottomRight = 50 + currentXOffset;
      return `polygon(${prevBottomLeft}% 0%, ${prevBottomRight}% 0%, ${currentBottomRight}% 100%, ${currentBottomLeft}% 100%)`;
    }
  };

  const calculateLeftOffset = () => {
    return (40 - (index + 1) * increment) * 0.5;
  };

  const clipPath = calculateClipPath();

  return (
    <div className={cn("group/pyramid-item relative w-full")}>
      <div className="flex items-center">
        <div className="relative flex-1">
          <div
            className="grid place-items-center text-2xl font-bold"
            style={{
              height: `${shapeHeight}px`,
              clipPath: clipPath as unknown as string,
              backgroundColor:
                (parentElement?.color as string) ||
                "var(--presentation-primary)",
              color: "var(--presentation-background)",
            }}
          >
            {index + 1}
          </div>
        </div>
        <div
          className="relative flex flex-1 items-center border-b border-gray-700"
          style={{
            minHeight: `${shapeHeight}px`,
            right: `calc(${calculateLeftOffset()}% + 37px)`,
          }}
        >
          <PlateElement {...props}>{props.children}</PlateElement>
        </div>
      </div>
    </div>
  );
}
