import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function BulletsElementStatic(props: PlateElementProps) {
  const items = props.element?.children ?? [];

  const getColumnClass = () => {
    const count = items.length;
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <PlateElement {...props} className={cn("my-6", props.className)}>
      <div className={cn("grid gap-6", getColumnClass())}>{props.children}</div>
    </PlateElement>
  );
}
