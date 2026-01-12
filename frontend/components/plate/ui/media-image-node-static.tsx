import {
  type TCaptionProps,
  type TImageElement,
  type TResizableProps,
} from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";

export function ImageElementStatic(
  props: PlateElementProps<TImageElement & TCaptionProps & TResizableProps>,
) {
  const { children, element } = props;

  return (
    <PlateElement {...props} className={cn("py-2.5", props.className)}>
      <figure className="m-0" contentEditable={false}>
        <img
          className="mx-auto block max-w-full rounded-sm"
          alt={(props.attributes?.alt as string) ?? "image"}
          src={element.url as string}
          style={{
            width: element.width ?? "100%",
          }}
        />
        {element.caption && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {element.caption[0]?.text}
          </figcaption>
        )}
      </figure>
      {children}
    </PlateElement>
  );
}
