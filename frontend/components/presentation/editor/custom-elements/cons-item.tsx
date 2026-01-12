"use client";

import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export const ConsItem = (props: PlateElementProps) => {
  return (
    <div
      className={cn("flex h-full flex-col rounded-lg p-6 text-white")}
      style={{
        background: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
      }}
    >
      <PlateElement {...props} className={cn("flex-1")}>
        {props.children}
      </PlateElement>
    </div>
  );
};
