"use client";

import { PlateElement, type PlateElementProps } from "platejs/react";
import { type TStairGroupElement } from "../plugins/staircase-plugin";

export default function Staircase(
  props: PlateElementProps<TStairGroupElement>,
) {
  return (
    <PlateElement {...props}>
      <div className="my-8">{props.children}</div>
    </PlateElement>
  );
}
