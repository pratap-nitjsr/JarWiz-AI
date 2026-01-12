import { type TAudioElement } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function AudioElementStatic(props: PlateElementProps<TAudioElement>) {
  return (
    <PlateElement {...props} className="mb-1">
      <audio
        className="mx-auto w-full max-w-[400px]"
        src={props.element.url}
        controls
      />
      {props.children}
    </PlateElement>
  );
}
