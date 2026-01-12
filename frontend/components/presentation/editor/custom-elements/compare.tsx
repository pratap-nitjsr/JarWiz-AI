"use client";

import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export default function CompareGroup(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "relative mb-4 grid grid-cols-[1fr_auto_1fr] items-start gap-6",
        )}
      >
        {props.children}
        <div
          className={cn(
            "col-start-2 row-span-full flex items-center justify-center self-center",
          )}
          aria-hidden
        >
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full text-sm font-bold shadow-sm",
            )}
            style={{
              backgroundColor:
                (props.element.color as string) ||
                "var(--presentation-primary)",
              color: "var(--presentation-background)",
              pointerEvents: "none",
            }}
          >
            VS
          </div>
        </div>
      </div>
    </PlateElement>
  );
}
