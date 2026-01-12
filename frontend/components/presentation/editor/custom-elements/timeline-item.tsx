"use client";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TTimelineGroupElement } from "../plugins/timeline-plugin";

export const containerVariants = cva("flex flex-1", {
  variants: {
    orientation: {
      horizontal: "items-center p-4 pt-0",
      vertical: "items-center p-4 pl-0",
    },
    sidedness: {
      single: "",
      double: "",
    },
    isEven: {
      true: "",
      false: "",
    },
    showLine: {
      true: "gap-6",
      false: "gap-4",
    },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      sidedness: "single",
      class: "flex-col",
    },

    {
      orientation: "horizontal",
      sidedness: "double",
      isEven: true,
      class: "flex-col self-end h-[calc(100%+2.25rem)] row-start-2 pt-4",
    },
    {
      orientation: "horizontal",
      sidedness: "double",
      isEven: false,
      class: "flex-col-reverse self-start h-[calc(100%+2rem)] row-start-1 pt-4",
    },

    {
      orientation: "vertical",
      sidedness: "double",
      isEven: true,
      class: "w-[calc(50%+2.25rem)]  place-self-end pl-4",
    },
    {
      orientation: "vertical",
      sidedness: "double",
      isEven: false,
      class: "w-[calc(50%+2.25rem)]  place-self-start flex-row-reverse pl-4",
    },
  ],
});

export const circleVariants = cva(
  "relative flex rounded-full text-sm font-bold size-10 items-center justify-center ring-1 ring-offset-2 shrink-0 ring-[var(--ring-color)]",
  {
    variants: {
      orientation: {
        horizontal: "",
        vertical: "",
      },
      sidedness: {
        single: "",
        double: "",
      },
    },
  },
);

export const lineVariants = cva("", {
  variants: {
    orientation: {
      horizontal: "",
      vertical: "",
    },
    sidedness: {
      single: "",
      double: "",
    },
    showLine: {
      true: "before:z-50 before:content-[''] before:absolute before:rounded-full before:bg-[var(--before-bg)]",
      false: "",
    },
    isEven: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      showLine: true,
      class:
        "before:left-1/2 before:-translate-x-1/2 before:top-1/2 before:translate-y-full before:h-1/2 before:w-[2px]",
    },

    {
      orientation: "horizontal",
      sidedness: "double",
      showLine: true,
      isEven: false,
      class:
        "before:left-1/2 before:-translate-x-1/2 before:top-0 before:-translate-y-full before:h-1/2 before:w-[2px]",
    },

    {
      orientation: "vertical",
      showLine: true,
      class:
        "before:top-1/2 before:-translate-y-1/2 before:left-1/2 before:translate-x-full before:w-1/2 before:h-[2px]",
    },

    {
      orientation: "vertical",
      sidedness: "double",
      showLine: true,
      isEven: false,
      class:
        "before:top-1/2 before:-translate-y-1/2 before:left-0 before:-translate-x-full before:w-1/2 before:h-[2px]",
    },
  ],
});

export const contentVariants = cva("flex", {
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
    sidedness: {
      single: "",
      double: "",
    },
  },
});

export function TimelineItem(props: PlateElementProps) {
  const parentPath = PathApi.parent(props.path);
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TTimelineGroupElement;
  const orientation = parentElement.orientation ?? "vertical";
  const sidedness = parentElement.sidedness ?? "single";
  const showLine = parentElement.showLine ?? true;
  const numbered = parentElement.numbered ?? true;
  const index = props.path.at(-1) ?? 0;
  const itemNumber = index + 1;
  const isEven = itemNumber % 2 === 0;

  const lineClass = lineVariants({ orientation, sidedness, showLine, isEven });
  return (
    //* Container
    <div
      className={cn(
        containerVariants({ orientation, sidedness, isEven, showLine }),
      )}
    >
      {/* Circle */}
      <div
        className={cn(circleVariants({ orientation, sidedness }), lineClass)}
        style={
          {
            backgroundColor:
              (parentElement.color as string) || "var(--presentation-primary)",
            color: "var(--presentation-background)",
            "--ring-color":
              (parentElement.color as string) || "var(--presentation-primary)",
            "--before-bg":
              (parentElement.color as string) || "var(--presentation-primary)",
          } as React.CSSProperties & {
            "--ring-color": string;
            "--before-bg": string;
          }
        }
      >
        {numbered ? itemNumber : ""}
      </div>
      {/* Content */}
      <PlateElement
        className={contentVariants({ orientation, sidedness })}
        {...props}
      >
        {props.children}
      </PlateElement>
    </div>
  );
}
