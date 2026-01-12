import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { type TCycleGroupElement } from "../../plugins/cycle-plugin";

export function CycleItemStatic(props: PlateElementProps) {
  const path = props.editor.api.findPath(props.element) ?? [-1];
  const parentPath = PathApi.parent(path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TCycleGroupElement;

  const hasOddItems =
    parentElement?.hasOddItems ||
    parentElement?.children?.length % 2 !== 0 ||
    false;
  const index = (path?.at(-1) as number) ?? 0;

  const getItemColor = () => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-indigo-500",
      "bg-pink-500",
    ];
    return colors[index % colors.length];
  };

  let columnStart: string;

  if (hasOddItems && index === 0) {
    columnStart = "col-start-2";
  } else {
    const adjustedIndex = hasOddItems ? index - 1 : index;
    columnStart = adjustedIndex % 2 === 0 ? "col-start-1" : "col-start-3";
  }

  return (
    <div className={cn("col-span-1", columnStart)}>
      <div className={cn("group/cycle-item relative mb-6")}>
        <div className="rounded-md border border-primary/20 bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center">
            <div
              className={cn(
                "mr-3 flex h-8 w-8 items-center justify-center rounded-full text-white",
                getItemColor(),
              )}
            >
              {index + 1}
            </div>
          </div>
          <div className="mt-2">
            <PlateElement {...props}>{props.children}</PlateElement>
          </div>
        </div>
      </div>
    </div>
  );
}
