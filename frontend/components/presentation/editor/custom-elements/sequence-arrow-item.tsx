"use client";

import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TSequenceArrowGroupElement } from "../plugins/sequence-arrow-plugin";

export const SequenceArrowItem = (props: PlateElementProps) => {
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TSequenceArrowGroupElement;
  const index = props.path.at(-1) ?? 0;
  const total = parentElement?.children?.length ?? 0;
  const isLast = index === total - 1;

  return (
    <div className={cn("relative w-full")} style={{ pointerEvents: "none" }}>
      <div
        className={cn("rounded-xl p-6 shadow-lg")}
        style={{
          backgroundColor:
            (parentElement.color as string) || "var(--presentation-primary)",
          color: "var(--presentation-background)",
        }}
      >
        <PlateElement {...props} className={cn("[&_*]:pointer-events-auto")}>
          {props.children}
        </PlateElement>
      </div>

      {!isLast && (
        <div
          className={cn("mx-auto h-0 w-0")}
          style={{
            borderLeft: "13px solid transparent",
            borderRight: "13px solid transparent",
            borderTop: `19px solid ${(parentElement.color as string) || "var(--presentation-primary)"}`,
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.08))",
          }}
        />
      )}
    </div>
  );
};
