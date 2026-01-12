import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export default function ArrowVerticalStatic(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "[&_:is(.presentation-heading)]:[-webkit-background-clip:unset!important;]",
          "[&_:is(.presentation-heading)]:[-webkit-text-fill-color:unset!important;]",
          "[&_:is(.presentation-heading)]:[background-clip:unset!important;]",
          "[&_:is(.presentation-heading)]:[background:none!important;]",
          "[&_:is(.presentation-heading)]:!text-primary",
        )}
      >
        {props.children}
      </div>
    </PlateElement>
  );
}
