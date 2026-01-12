import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TArrowListElement } from "../plugins/arrow-plugin";

export default function ArrowList(props: PlateElementProps<TArrowListElement>) {
  return (
    <div className="my-4 mb-8 flex w-full flex-col overflow-visible">
      {/* Timeline items container */}
      <PlateElement {...props}>{props.children}</PlateElement>
    </div>
  );
}
