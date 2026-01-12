import { PlateLeaf, type PlateLeafProps } from "platejs/react";

import { usePresentationState } from "@/states/presentation-state";

export function GeneratingLeafStatic(props: PlateLeafProps) {
  const { isGeneratingPresentation } = usePresentationState();
  type LeafWithGenerating = { generating?: boolean };
  const isGenerating =
    isGeneratingPresentation &&
    Boolean(
      (props.leaf as unknown as LeafWithGenerating | undefined)?.generating,
    );

  return (
    <PlateLeaf {...props}>
      <span className="flex items-end gap-1">
        {props.children}
        {isGenerating && (
          <span
            style={{
              color: "var(--presentation-text , black) !important",
              backgroundColor: "var(--presentation-text , black) !important",
            }}
            className="animate-blink z-[1000] max-h-8"
          >
            |
          </span>
        )}
      </span>
    </PlateLeaf>
  );
}
