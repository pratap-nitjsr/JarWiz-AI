import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TColumnElement } from "platejs";

export function ColumnElementStatic(props: PlateElementProps<TColumnElement>) {
  const { width } = props.element;

  return (
    <div className="group/column relative" style={{ width: width ?? "100%" }}>
      <PlateElement
        className="h-full px-2 pt-2 group-first/column:pl-0 group-last/column:pr-0"
        {...props}
      >
        <div className="relative h-full border border-transparent p-1.5">
          {props.children}
        </div>
      </PlateElement>
    </div>
  );
}

export function ColumnGroupElementStatic(props: PlateElementProps) {
  return (
    <PlateElement className="mb-2" {...props}>
      <div className="flex size-full rounded">{props.children}</div>
    </PlateElement>
  );
}
