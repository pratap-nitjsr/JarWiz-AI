/* eslint-disable react/display-name */
import type * as React from "react";

import {
  type TListElement,
} from "platejs";
import { type PlateElementProps } from "platejs/react";

import { isOrderedList } from "@platejs/list";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const config: Record<
  string,
  {
    Li: React.FC<PlateElementProps>;
    Marker: React.FC<PlateElementProps>;
  }
> = {
  todo: {
    Li: TodoLiStatic,
    Marker: TodoMarkerStatic,
  },
};

export const BlockListStatic = (props: PlateElementProps<TListElement>) => {
  if (!props.element.listStyleType) return null;

  return (contextProps: any) => <List {...props} {...contextProps} />;
};

function List(props: PlateElementProps) {
  const { listStart, listStyleType } = props.element as TListElement;
  const { Li, Marker } = config[listStyleType] ?? {};
  const List = isOrderedList(props.element) ? "ol" : "ul";

  return (
    <List
      className="relative m-0 p-0"
      style={{ listStyleType }}
      start={listStart}
    >
      {Marker && <Marker {...props} />}
      {Li ? <Li {...props} /> : <li>{props.children}</li>}
    </List>
  );
}

function TodoMarkerStatic(props: PlateElementProps) {
  const checked = props.element.checked as boolean;

  return (
    <div contentEditable={false}>
      <button
        className={cn(
          "peer pointer-events-none absolute -left-6 top-1 size-4 shrink-0 rounded-sm border border-primary bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          props.className,
        )}
        data-state={checked ? "checked" : "unchecked"}
        type="button"
      >
        <div className={cn("flex items-center justify-center text-current")}>
          {checked && <CheckIcon className="size-4" />}
        </div>
      </button>
    </div>
  );
}

function TodoLiStatic(props: PlateElementProps) {
  return (
    <li
      className={cn(
        "list-none",
        (props.element.checked as boolean) &&
        "text-muted-foreground line-through",
      )}
    >
      {props.children}
    </li>
  );
}
