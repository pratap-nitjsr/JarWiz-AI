import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function PresentationElementStatic(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      className={cn(
        "presentation-element relative !select-text",
        props.className,
      )}
    >
      {props.children}
    </PlateElement>
  );
}
