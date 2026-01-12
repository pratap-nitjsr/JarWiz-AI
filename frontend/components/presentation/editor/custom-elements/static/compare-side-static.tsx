import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function CompareSideStatic(props: PlateElementProps) {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const index = (path?.at(-1) as number) ?? 0;
  const gridColumn = index % 2 === 0 ? 1 : 3;

  // Get parent element for color
  const parentPath = PathApi.parent(path);
  const parentElement = NodeApi.get(props.editor, parentPath);

  return (
    <div
      className={cn("flex w-full max-w-[520px] flex-col items-center gap-5")}
      style={{ gridColumn }}
    >
      <div
        className={cn(
          "w-full rounded-xl border bg-card p-6 shadow-md",
          "border-t-4",
        )}
        style={{
          backgroundColor: "var(--presentation-background)",
          color: "var(--presentation-text)",
          borderColor: "hsl(var(--border))",
          borderTopColor:
            (parentElement?.color as string) || "var(--presentation-primary)",
        }}
      >
        <PlateElement {...props}>{props.children}</PlateElement>
      </div>
    </div>
  );
}
