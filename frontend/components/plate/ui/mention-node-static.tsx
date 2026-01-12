import * as React from "react";

import { type TMentionElement } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function MentionElementStatic(
  props: PlateElementProps<TMentionElement> & {
    onClick?: (mention: TMentionElement) => void;
    renderLabel?: (mention: TMentionElement) => React.ReactNode;
  },
) {
  const { children, element } = props;

  return (
    <PlateElement
      className={cn(
        "inline-block cursor-pointer rounded-md bg-muted px-1.5 py-0.5 align-baseline text-sm font-medium",
        !!(element.children[0] as any)?.bold && "font-bold",
        !!(element.children[0] as any)?.italic && "italic",
      )}
      {...props}
    >
      @{element.value}
      {children}
    </PlateElement>
  );
}
