// custom-elements/pyramid-item.tsx
"use client";
import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import {
  type TPyramidGroupElement,
  type TPyramidItemElement,
} from "../plugins/pyramid-plugin";

// PyramidItem component for individual items in the pyramid
export const PyramidItem = (props: PlateElementProps<TPyramidItemElement>) => {
  // Get the parent pyramid element to access totalChildren
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TPyramidGroupElement;

  // Get total items from parent element, fallback to calculating from parent's children
  const totalItems = parentElement?.children?.length || 1;
  const index = props.path.at(-1)!;

  // Constants for shape sizes
  const shapeHeight = 80;
  const maxWidthPercentage = 80; // Maximum width the bottom layer should take up
  const increment = maxWidthPercentage / (2 * totalItems);

  // Calculate clip path using the provided algorithm
  const calculateClipPath = () => {
    if (index === 0) {
      // First layer is a triangle
      return `polygon(50% 0%, ${50 - increment}% 100%, ${50 + increment}% 100%)`;
    } else {
      // For other layers
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
      {/* The pyramid item layout */}
      <div className="flex items-center">
        {/* Shape with number */}
        <div className="relative flex-1">
          <div
            className="grid place-items-center text-2xl font-bold"
            style={{
              height: `${shapeHeight}px`,
              clipPath: clipPath,
              backgroundColor:
                (parentElement?.color as string) ||
                "var(--presentation-primary)",
              color: "var(--presentation-background)",
            }}
          >
            {index + 1}
          </div>
        </div>
        {/* Content area with proper vertical alignment and negative margin */}
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
};
