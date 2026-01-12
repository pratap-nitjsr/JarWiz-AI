import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function IconListItemStatic(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div className={cn("group/icon-item relative w-full")}>
        <div className="grid w-full grid-cols-[auto_1fr] items-center gap-[0px_1rem] [&>[data-slate-node=element]:first-child]:col-start-1 [&>[data-slate-node=element]:not(:first-child)]:col-start-2">
          {props.children}
        </div>
      </div>
    </PlateElement>
  );
}
