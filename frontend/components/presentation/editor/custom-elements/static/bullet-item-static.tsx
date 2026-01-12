import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { type TBulletItemElement } from "../../plugins/bullet-plugin";
// Static bullet item mirrors UI but computes index from path
export function BulletItemStatic(props: PlateElementProps<TBulletItemElement>) {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const parentPath = PathApi.parent(path);
  const parentElement = NodeApi.get(props.editor, parentPath);

  const index =
    (props.editor.api.findPath(props.element)?.at(-1) as number) ?? 0;

  return (
    <div className={cn("group/bullet-item relative")}>
      <div className="flex items-start">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-primary text-xl font-bold text-primary-foreground"
          style={{
            backgroundColor:
              (parentElement?.color as string) || "var(--presentation-primary)",
            color: "var(--presentation-background)",
          }}
        >
          {index + 1}
        </div>

        <PlateElement className="ml-4 flex-1" {...props}>
          {props.children}
        </PlateElement>
      </div>
    </div>
  );
}
