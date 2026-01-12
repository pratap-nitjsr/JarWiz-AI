import { cn } from "@/lib/utils";
import { NodeApi, PathApi } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TTimelineGroupElement } from "../../plugins/timeline-plugin";
import {
  circleVariants,
  containerVariants,
  contentVariants,
  lineVariants,
} from "../timeline-item";

export function TimelineItemStatic(props: PlateElementProps) {
  const parentPath = PathApi.parent(
    props.editor.api.findPath(props.element) ?? [-1],
  );
  const parentElement = NodeApi.get(
    props.editor,
    parentPath,
  ) as TTimelineGroupElement;
  const orientation = parentElement.orientation ?? "vertical";
  const sidedness = parentElement.sidedness ?? "single";
  const showLine = parentElement.showLine ?? true;
  const numbered = parentElement.numbered ?? false;
  const index =
    (props.editor.api.findPath(props.element)?.at(-1) as number) ?? 0;
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
        style={{
          backgroundColor:
            (parentElement.color as string) || "var(--presentation-primary)",
          color: "var(--presentation-background)",
        }}
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
