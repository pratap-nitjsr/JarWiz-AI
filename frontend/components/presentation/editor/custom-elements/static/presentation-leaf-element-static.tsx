import { PlateLeaf, type PlateLeafProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function PresentationLeafElementStatic(props: PlateLeafProps) {
  return (
    <PlateLeaf {...props} className={cn("presentation-leaf", props.className)}>
      {props.children}
    </PlateLeaf>
  );
}
