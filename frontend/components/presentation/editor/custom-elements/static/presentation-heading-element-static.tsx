import type * as React from "react";

import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const headingVariants = cva("relative mb-1", {
  variants: {
    variant: {
      h1: "pb-1 text-5xl font-bold",
      h2: "pb-px text-3xl font-semibold tracking-tight",
      h3: "pb-px text-2xl font-semibold tracking-tight",
      h4: "text-xl font-semibold tracking-tight",
      h5: "text-lg font-semibold tracking-tight",
      h6: "text-base font-semibold tracking-tight",
    },
  },
});

export function PresentationHeadingElementStatic({
  variant = "h1",
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) {
  return (
    <PlateElement
      as={variant!}
      className={cn("presentation-heading", headingVariants({ variant }))}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}

export function H1ElementStatic(props: PlateElementProps) {
  return <PresentationHeadingElementStatic variant="h1" {...props} />;
}

export function H2ElementStatic(
  props: React.ComponentProps<typeof PresentationHeadingElementStatic>,
) {
  return <PresentationHeadingElementStatic variant="h2" {...props} />;
}

export function H3ElementStatic(
  props: React.ComponentProps<typeof PresentationHeadingElementStatic>,
) {
  return <PresentationHeadingElementStatic variant="h3" {...props} />;
}

export function H4ElementStatic(
  props: React.ComponentProps<typeof PresentationHeadingElementStatic>,
) {
  return <PresentationHeadingElementStatic variant="h4" {...props} />;
}

export function H5ElementStatic(
  props: React.ComponentProps<typeof PresentationHeadingElementStatic>,
) {
  return <PresentationHeadingElementStatic variant="h5" {...props} />;
}

export function H6ElementStatic(
  props: React.ComponentProps<typeof PresentationHeadingElementStatic>,
) {
  return <PresentationHeadingElementStatic variant="h6" {...props} />;
}
