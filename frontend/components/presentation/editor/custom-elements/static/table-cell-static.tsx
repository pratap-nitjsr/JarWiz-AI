import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function TableCellStatic(props: PlateElementProps) {
  return (
    <div
      className={cn("rounded border bg-card p-3 text-sm")}
      style={{
        backgroundColor: "var(--presentation-background)",
        color: "var(--presentation-text)",
        borderColor: "hsl(var(--border))",
      }}
    >
      <PlateElement {...props}>{props.children}</PlateElement>
    </div>
  );
}
