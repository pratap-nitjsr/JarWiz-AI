import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function PresentationParagraphElementStatic(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      className={cn("presentation-paragraph m-0 px-0 py-1 text-base")}
    >
      {props.children}
    </PlateElement>
  );
}
