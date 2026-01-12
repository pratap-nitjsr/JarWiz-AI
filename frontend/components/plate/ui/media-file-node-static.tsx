import { type TFileElement } from "platejs";

import { FileTextIcon } from "lucide-react";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function FileElementStatic(props: PlateElementProps<TFileElement>) {
  const { name, url } = props.element;

  return (
    <PlateElement className="my-px rounded-sm" {...props}>
      <a
        className="flex w-fit items-center gap-1 p-1"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <FileTextIcon className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">{name}</span>
      </a>
      {props.children}
    </PlateElement>
  );
}
