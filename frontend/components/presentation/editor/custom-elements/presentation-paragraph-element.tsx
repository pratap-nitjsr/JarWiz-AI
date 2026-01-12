"use client";

import { cn } from "@/lib/utils";
import { PlateElement, withRef } from "platejs/react";
import type React from "react";

export interface PresentationParagraphElementProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const PresentationParagraphElement = withRef<
  typeof PlateElement,
  PresentationParagraphElementProps
>(({ className, children, ...props }, ref) => {
  return (
    <PlateElement
      ref={ref}
      as="p"
      className={cn(
        "presentation-paragraph m-0 px-0 py-1 text-base",
        className,
      )}
      {...props}
    >
      {children}
    </PlateElement>
  );
});

PresentationParagraphElement.displayName = "PresentationParagraphElement";
