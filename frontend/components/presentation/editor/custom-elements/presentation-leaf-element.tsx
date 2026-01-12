"use client";

import { cn } from "@/lib/utils";
import { PlateLeaf, withRef } from "platejs/react";
import type React from "react";

export interface PresentationLeafElementProps {
  className?: string;
  variant?: "primary" | "secondary" | "text" | "heading";
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const PresentationLeafElement = withRef<
  typeof PlateLeaf,
  PresentationLeafElementProps
>(({ className, variant = "text", children, ...props }, ref) => {
  // Get the appropriate class name based on theme, mode and variant
  return (
    <PlateLeaf
      ref={ref}
      className={cn("presentation-leaf", `presentation-${variant}`, className)}
      {...props}
    >
      {children}
    </PlateLeaf>
  );
});

PresentationLeafElement.displayName = "PresentationLeafElement";
