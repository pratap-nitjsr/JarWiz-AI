import {
  type TCaptionElement,
  type TResizableProps,
  type TVideoElement,
} from "platejs";

import { PlateElement, type PlateElementProps } from "platejs/react";

export function VideoElementStatic(
  props: PlateElementProps<TVideoElement & TCaptionElement & TResizableProps>,
) {
  const { children, element } = props;

  return (
    <PlateElement className="py-2.5" {...props}>
      <div className="mx-auto" style={{ width: element.width ?? "100%" }}>
        <video
          className="w-full rounded-sm"
          src={element.url as string}
          poster={element.poster}
          controls
        />
      </div>
      {children}
    </PlateElement>
  );
}
