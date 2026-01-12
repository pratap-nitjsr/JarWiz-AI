import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

export default function BeforeAfterGroupStatic(props: PlateElementProps) {
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(props.editor, parentPath);

  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "grid grid-cols-[1fr_auto_1fr] items-start  gap-8 md:gap-10",
        )}
      >
        {props.children}
        <div
          className={cn(
            "col-start-2 row-start-1 flex items-center justify-center self-center",
          )}
        >
          <div
            className={cn(
              "grid h-14 w-14 place-items-center rounded-full text-xl font-bold shadow-xl",
            )}
            style={{
              backgroundColor:
                (parentElement?.color as string) ||
                "var(--presentation-primary)",
              color: "var(--presentation-background)",
              boxShadow:
                "0 10px 30px rgba(108,122,224,0.3), 0 0 0 6px rgba(108,122,224,0.08)",
              pointerEvents: "none",
            }}
          >
            <ArrowRight />
          </div>
        </div>
      </div>
    </PlateElement>
  );
}
