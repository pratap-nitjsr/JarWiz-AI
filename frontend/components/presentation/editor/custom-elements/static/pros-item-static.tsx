import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function ProsItemStatic(props: PlateElementProps) {
  return (
    <div
      className={cn("rounded-lg p-6 text-white")}
      style={{
        background: "linear-gradient(135deg, #27ae60 0%, #229954 100%)",
      }}
    >
      <PlateElement {...props}>{props.children}</PlateElement>
    </div>
  );
}
