import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TElement } from "platejs";
import type * as React from "react";
import { type BUTTON_ELEMENT } from "../../lib";

type ButtonStaticElement = TElement & {
  type: typeof BUTTON_ELEMENT;
  variant?: "filled" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

export default function ButtonStatic(
  props: PlateElementProps<ButtonStaticElement>,
) {
  const element = props.element as ButtonStaticElement;
  const variant = element.variant ?? "filled";
  const size = element.size ?? "md";

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1 text-sm"
      : size === "lg"
        ? "px-6 py-3 text-lg"
        : "px-4 py-2 text-base";

  const commonClasses = "inline-flex items-center gap-2 rounded-md font-medium";

  const variantClasses =
    variant === "outline"
      ? "border"
      : variant === "ghost"
        ? "bg-transparent"
        : "shadow-sm";

  const style: React.CSSProperties = (() => {
    if (variant === "outline") {
      return {
        color: element.color || "var(--presentation-primary)",
        backgroundColor: "transparent",
        borderColor: element.color || "var(--presentation-primary)",
      } as React.CSSProperties;
    }
    if (variant === "ghost") {
      return {
        color: element.color || "var(--presentation-primary)",
        backgroundColor: "transparent",
      } as React.CSSProperties;
    }
    return {
      backgroundColor: element.color || "var(--presentation-primary)",
      color: "var(--presentation-background)",
    } as React.CSSProperties;
  })();

  return (
    <PlateElement
      {...props}
      className={cn("presentation-element", props.className)}
    >
      <div
        className={cn(commonClasses, sizeClasses, variantClasses)}
        style={style}
      >
        {props.children}
      </div>
    </PlateElement>
  );
}
