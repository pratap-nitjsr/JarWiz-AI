import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function ConsItemStatic(props: PlateElementProps) {
  return (
    <div
      className={cn("rounded-lg p-6 text-white")}
      style={{
        background: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
      }}
    >
      <PlateElement {...props}>{props.children}</PlateElement>
    </div>
  );
}
