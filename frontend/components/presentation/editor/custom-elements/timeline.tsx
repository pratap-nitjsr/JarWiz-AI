import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TTimelineGroupElement } from "../plugins/timeline-plugin";

export const containerVariants = cva("flex mb-4", {
  variants: {
    orientation: {
      horizontal: "justify-around",
      vertical: "flex-col",
    },

    sidedness: {
      single: "",
      double: "",
    },
  },
});

export const lineVariants = cva("absolute transform", {
  variants: {
    orientation: {
      horizontal: "h-[2px]",
      vertical: "w-[2px]",
    },

    sidedness: {
      single: "",
      double: "",
    },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      sidedness: "single",
      class: "left-0 right-0 top-5",
    },
    {
      orientation: "horizontal",
      sidedness: "double",
      class: "left-0 right-0 top-1/2 -translate-y-1/2",
    },
    {
      orientation: "vertical",
      sidedness: "single",
      class: "left-5 inset-y-4",
    },
    {
      orientation: "vertical",
      sidedness: "double",
      class: "bottom-0 left-1/2 top-0 -translate-x-1/2",
    },
  ],
});

export default function Timeline({
  element,
  children,
  ...props
}: PlateElementProps<TTimelineGroupElement>) {
  const orientation = element.orientation ?? "vertical";
  const sidedness = element.sidedness ?? "single";

  return (
    <PlateElement element={element} {...props}>
      <div
        className={cn(lineVariants({ orientation, sidedness }))}
        style={{
          backgroundColor:
            (element.color as string) || "var(--presentation-primary)",
        }}
      />

      <div
        className={cn(
          containerVariants({ orientation, sidedness }),
          orientation === "horizontal" && "[&>*]:flex-1",
          orientation === "horizontal" &&
            sidedness === "double" &&
            "[&>div>div>div.slate-blockWrapper]:grid [&>div>div>div.slate-blockWrapper]:grid-rows-2",
        )}
      >
        {children}
      </div>
    </PlateElement>
  );
}
