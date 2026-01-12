import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function SequenceArrowItemStatic(props: PlateElementProps) {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const parentPath = PathApi.parent(path);
  const parent = NodeApi.get(props.editor, parentPath);
  const index = (path?.at(-1) as number) ?? 0;
  const total = parent?.children ? (parent.children as unknown[]).length : 0;
  const isLast = index === total - 1;

  return (
    <div className={cn("relative w-full")} style={{ pointerEvents: "none" }}>
      <div
        className={cn("rounded-xl p-6 shadow-lg")}
        style={{
          backgroundColor:
            (parent?.color as string) || "var(--presentation-primary)",
          color: "var(--presentation-background)",
        }}
      >
        <PlateElement {...props}>{props.children}</PlateElement>
      </div>

      {!isLast && (
        <div
          className={cn("mx-auto h-0 w-0")}
          style={{
            borderLeft: "13px solid transparent",
            borderRight: "13px solid transparent",
            borderTop: `19px solid ${(parent?.color as string) || "var(--presentation-primary)"}`,
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.08))",
          }}
        />
      )}
    </div>
  );
}
