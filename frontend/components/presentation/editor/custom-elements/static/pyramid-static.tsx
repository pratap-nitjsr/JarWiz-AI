import { PlateElement, type PlateElementProps } from "platejs/react";

export default function PyramidStatic(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div className="my-4 mb-8 flex w-full flex-col overflow-visible">
        {props.children}
      </div>
    </PlateElement>
  );
}
