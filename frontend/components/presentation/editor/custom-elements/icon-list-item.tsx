"use client";

import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TIconElement } from "../plugins/icon-plugin";

// IconItem component for individual items in the icons list
export const IconListElement = (props: PlateElementProps<TIconElement>) => {
  return (
    <PlateElement {...props}>
      <div className={cn("group/icon-item relative w-full")}>
        {/* The icon item layout - vertical alignment with icon at top */}
        <div className="grid w-full grid-cols-[auto_1fr] items-center gap-[0px_1rem] [&>[data-slate-node=element]:first-child]:col-start-1 [&>[data-slate-node=element]:not(:first-child)]:col-start-2">
          {props.children}
        </div>
      </div>
    </PlateElement>
  );
};
