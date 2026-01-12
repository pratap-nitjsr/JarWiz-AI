"use client";

import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

export const BoxItem = (props: PlateElementProps) => {
  // Get parent element for color
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(props.editor, parentPath);

  return (
    <div
      className={cn(
        "rounded-md border p-4",
        "[&_:is(.presentation-heading)]:[-webkit-background-clip:unset!important;]",
        "[&_:is(.presentation-heading)]:[-webkit-text-fill-color:unset!important;]",
        "[&_:is(.presentation-heading)]:[background-clip:unset!important;]",
        "[&_:is(.presentation-heading)]:[background:none!important;]",
        "[&_:is(.presentation-heading)]:!text-primary",
      )}
      style={{
        backgroundColor:
          (parentElement?.color as string) || "var(--presentation-primary)",
        borderColor: "hsl(var(--border))",
        color: "var(--presentation-background)",
      }}
    >
      <PlateElement {...props}>{props.children}</PlateElement>
    </div>
  );
};
