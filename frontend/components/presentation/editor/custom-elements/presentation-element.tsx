"use client";

import { cn } from "@/lib/utils";
import { PlateElement, type StyledPlateElementProps } from "platejs/react";

export const PresentationElement = ({
  children,
  ref,
  className,
  ...props
}: StyledPlateElementProps) => {
  return (
    <PlateElement
      ref={ref}
      className={cn("presentation-element relative !select-text", className)}
      {...props}
    >
      {children}
    </PlateElement>
  );
};

PresentationElement.displayName = "PresentationElement";
