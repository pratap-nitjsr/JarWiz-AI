"use client";

// Import IconItem and constants
import { cn } from "@/lib/utils";
import { PlateElement, withRef } from "platejs/react";

// Main icons component with withRef pattern
export const IconList = withRef<typeof PlateElement>(
  ({ element, children, className, ...props }, ref) => {
    const items = element.children;

    // Determine number of columns based on item count
    const getColumnClass = () => {
      const count = items.length;
      if (count <= 2) return "grid-cols-1";
      if (count <= 2) return "grid-cols-2";
      return "grid-cols-3"; // Max 3 columns
    };

    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn("my-6", className)}
        {...props}
      >
        <div className={cn("grid gap-6", getColumnClass())}>{children}</div>
      </PlateElement>
    );
  },
);
