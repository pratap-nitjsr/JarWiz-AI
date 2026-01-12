"use client";

import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export default function BoxGroup(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div className={cn("grid gap-6 md:grid-cols-2")}>{props.children}</div>
    </PlateElement>
  );
}
