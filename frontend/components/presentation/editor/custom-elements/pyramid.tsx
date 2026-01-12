// custom-elements/pyramid.tsx
import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TPyramidGroupElement } from "../plugins/pyramid-plugin";

export default function Pyramid(
  props: PlateElementProps<TPyramidGroupElement>,
) {
  return (
    <PlateElement {...props}>
      <div className="my-4 mb-8 flex w-full flex-col overflow-visible">
        {props.children}
      </div>
    </PlateElement>
  );
}
