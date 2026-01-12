import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function HrElementStatic(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div className="py-6" contentEditable={false}>
        <hr className="h-0.5 rounded-sm border-none bg-muted bg-clip-content" />
      </div>
      {props.children}
    </PlateElement>
  );
}
