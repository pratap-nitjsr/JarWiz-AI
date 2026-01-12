import { type TLinkElement } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function LinkElementStatic(props: PlateElementProps<TLinkElement>) {
  return (
    <PlateElement
      as="a"
      className="text-primary underline decoration-primary underline-offset-4"
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}
