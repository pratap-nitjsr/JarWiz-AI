import { PlateElement, type PlateElementProps } from "platejs/react";

export default function StaircaseStatic(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div className="my-8">{props.children}</div>
    </PlateElement>
  );
}
