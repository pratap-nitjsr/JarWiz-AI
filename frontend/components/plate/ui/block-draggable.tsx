"use client";

import { DndPlugin } from "@platejs/dnd";
import { expandListItemsWithChildren } from "@platejs/list";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { GripHorizontal, GripVertical } from "lucide-react";
import {
  type TElement,
  getContainerTypes,
  isType,
  KEYS,
  PathApi,
} from "platejs";
import {
  type PlateEditor,
  type PlateElementProps,
  type RenderNodeWrapper,
  MemoizedChildren,
  useEditorRef,
  useElement,
  usePath,
  usePluginOption,
  useSelected,
} from "platejs/react";
import * as React from "react";

import { Button } from "@/components/plate/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/plate/ui/tooltip";
import { useDraggable } from "@/components/presentation/editor/dnd/hooks/useDraggable";
import { useDropLine } from "@/components/presentation/editor/dnd/hooks/useDropLine";
import { getGridClassForElement } from "@/components/presentation/editor/lib";
import { cn } from "@/lib/utils";
import { MultiDndPlugin } from "../plugins/dnd-kit";

// Configuration constants
const UNDRAGGABLE_KEYS = [KEYS.tr, KEYS.td];

// Elements that should have horizontal orientation

// Elements that can only drop within same parent (sibling-only drops)
const SIBLING_ONLY_DROP_ELEMENTS = ["column", "table-row", "list-item"];

// Helper function to determine element orientation

// Helper function to check if element requires sibling-only drops
const requiresSiblingOnlyDrop = (elementType: string): boolean => {
  return SIBLING_ONLY_DROP_ELEMENTS.includes(elementType);
};

export const BlockDraggable: RenderNodeWrapper = (props) => {
  const { editor, element, path } = props;

  if (!props) return;

  // biome-ignore lint/correctness/useHookAtTopLevel: We don't need to calculate anything when props are not available
  const enabled = React.useMemo(() => {
    if (editor.dom.readOnly) return false;
    if (!path) return false;

    // Check if element is undraggable
    if (isType(editor, element, UNDRAGGABLE_KEYS)) return false;

    // Enable dragging for elements at different depths
    if (path.length === 1) return true;
    if (path.length === 2) return true;

    if (path.length === 3) {
      const isInColumn = editor.api.some({
        at: path,
        match: { type: editor.getType(KEYS.column) },
      });
      return isInColumn;
    }

    if (path.length === 4) {
      const isInTable = editor.api.some({
        at: path,
        match: { type: editor.getType(KEYS.table) },
      });
      return isInTable;
    }

    return false;
  }, [editor, element, path]);

  if (!enabled) return;

  // eslint-disable-next-line react/display-name
  return (props) => <Draggable {...props} />;
};

export function Draggable(props: PlateElementProps) {
  const { children, editor, element, path } = props;
  const blockSelectionApi = editor.getApi(BlockSelectionPlugin).blockSelection;

  let orientation: "vertical" | "horizontal" | undefined;
  const { isAboutToDrag, isDragging, nodeRef, previewRef, handleRef } =
    useDraggable({
      element,
      onDropHandler: (_, { dragItem }) => {
        const id = (dragItem as { id: string[] | string }).id;
        if (blockSelectionApi && id) {
          blockSelectionApi.add(id);
        }
        resetPreview();
        return undefined;
      },
      canDropNode: ({ dragEntry, dropEntry }) => {
        const dragElementType = dragEntry[0].type;

        // Check if this element requires sibling-only drops
        if (requiresSiblingOnlyDrop(dragElementType)) {
          const dragParentPath = PathApi.parent(dragEntry[1]);
          const dropParentPath = PathApi.parent(dropEntry[1]);

          // First check: Direct siblings (same parent)
          if (PathApi.equals(dragParentPath, dropParentPath)) {
            return true;
          }

          // Second check: Check if drop target is a child of a valid sibling
          // We need to traverse up the drop entry's ancestors to see if any of them
          // are siblings of the drag entry
          let currentDropPath = dropEntry[1];

          while (currentDropPath.length > 0) {
            const currentParentPath = PathApi.parent(currentDropPath);

            // If we found a path where the parent matches our drag element's parent,
            // then the drop target is within a valid sibling
            if (PathApi.equals(dragParentPath, currentParentPath)) {
              // Additional check: make sure the sibling element is the same type as drag element
              // This ensures we're dropping within a column if we're dragging a column, etc.
              const siblingPath = currentDropPath;
              const siblingEntry = editor.api.node({ at: siblingPath });

              if (siblingEntry && siblingEntry[0].type === dragElementType) {
                return true;
              }
            }

            // Move up one level
            currentDropPath = PathApi.parent(currentDropPath);
          }

          // If no valid sibling relationship found, disallow the drop
          return false;
        }

        // Default behavior: allow drops anywhere
        return true;
      },
    });

  const isInColumn = path.length === 3;
  const isInTable = path.length === 4;

  if (path.length === 2) {
    orientation = "horizontal";
  }

  const [previewTop, setPreviewTop] = React.useState(0);

  const resetPreview = () => {
    if (previewRef.current) {
      previewRef.current.replaceChildren();
      previewRef.current?.classList.add("hidden");
    }
  };

  // Clear up virtual multiple preview when drag ends
  React.useEffect(() => {
    if (!isDragging) {
      resetPreview();
    }
  }, [isDragging, previewRef]);

  React.useEffect(() => {
    if (isAboutToDrag) {
      previewRef.current?.classList.remove("opacity-0");
    }
  }, [isAboutToDrag, previewRef]);

  return (
    <div
      className={cn(
        path?.length === 1 && "px-16",
        // path?.length === 2 && "pl-8",
        getGridClassForElement(
          editor as unknown as PlateEditor,
          element as unknown as TElement,
        ),
      )}
      ref={nodeRef}
    >
      <div
        className={cn(
          "relative h-full",
          isDragging && "opacity-50",
          "after:absolute after:-inset-1 after:pointer-events-none hover:after:border hover:after:border-blue-400",
          getContainerTypes(editor).includes(element.type)
            ? "group/container"
            : "group",
        )}
      >
        {!isInTable && (
          <Gutter orientation={orientation}>
            <div
              className={cn(
                "slate-blockToolbarWrapper",
                "flex",
                orientation === "horizontal"
                  ? "h-6 w-full justify-center"
                  : "h-[1.5em]",
                isType(editor, element, [
                  KEYS.h1,
                  KEYS.h2,
                  KEYS.h3,
                  KEYS.h4,
                  KEYS.h5,
                ]) &&
                  orientation === "vertical" &&
                  "h-[1.3em]",
                isInColumn && orientation === "vertical" && "h-4",
              )}
            >
              <div
                className={cn(
                  "slate-blockToolbar",
                  "pointer-events-auto flex items-center",
                  orientation === "horizontal" ? "mb-1" : "mr-1",
                  isInColumn && orientation === "vertical" && "mr-1.5",
                )}
              >
                <Button
                  ref={handleRef}
                  variant="ghost"
                  className={cn(
                    "p-0 bg-background/50",
                    orientation === "horizontal" ? "h-5 w-6" : "h-6 w-5",
                  )}
                  data-plate-prevent-deselect
                >
                  <DragHandle
                    orientation={orientation}
                    isDragging={isDragging}
                    previewRef={previewRef}
                    resetPreview={resetPreview}
                    setPreviewTop={setPreviewTop}
                  />
                </Button>
              </div>
            </div>
          </Gutter>
        )}

        <div
          ref={previewRef}
          className={cn("pointer-events-none absolute -left-0 hidden w-full")}
          style={{ top: `${-previewTop}px` }}
          contentEditable={false}
        />

        <div
          className="slate-blockWrapper h-full"
          onContextMenu={(event) =>
            editor
              .getApi(BlockSelectionPlugin)
              .blockSelection.addOnContextMenu({ element, event })
          }
        >
          <MemoizedChildren>{children}</MemoizedChildren>
          <DropLine />
        </div>
      </div>
    </div>
  );
}

function Gutter({
  children,
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  const editor = useEditorRef();
  const element = useElement();
  const path = usePath();
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    "isSelectionAreaVisible",
  );

  const selected = useSelected();

  const isNodeType = (keys: string[] | string) => isType(editor, element, keys);
  const isInColumn = path.length === 3;

  return (
    <div
      {...props}
      className={cn(
        "slate-gutterLeft",
        "absolute z-50 flex cursor-text hover:opacity-100 sm:opacity-0",
        orientation === "horizontal"
          ? "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
          : "left-0 top-0 h-full -translate-x-full",
        getContainerTypes(editor).includes(element.type)
          ? "group-hover/container:opacity-100"
          : "group-hover:opacity-100",
        isSelectionAreaVisible && "hidden",
        !selected && "opacity-0",
        // Vertical orientation specific styles
        orientation === "vertical" && [
          isNodeType(KEYS.h1) && "pb-1 text-[1.875em]",
          isNodeType(KEYS.h2) && "pb-1 text-[1.5em]",
          isNodeType(KEYS.h3) && "pb-1 pt-[2px] text-[1.25em]",
          isNodeType([KEYS.h4, KEYS.h5]) && "pb-0 pt-1 text-[1.1em]",
          isNodeType(KEYS.h6) && "pb-0",
          isNodeType(KEYS.p) && "pb-0 pt-1",
          isNodeType(KEYS.blockquote) && "pb-0",
          isNodeType(KEYS.codeBlock) && "pb-0 pt-6",
          isNodeType([
            KEYS.img,
            KEYS.mediaEmbed,
            KEYS.excalidraw,
            KEYS.toggle,
            KEYS.column,
          ]) && "py-0",
          isNodeType([KEYS.placeholder, KEYS.table]) && "pb-0 pt-3",
          isInColumn && "mt-2 h-4 pt-0",
        ],
        className,
      )}
      contentEditable={false}
    >
      {children}
    </div>
  );
}

const DragHandle = React.memo(function DragHandle({
  orientation = "vertical",
  isDragging,
  previewRef,
  resetPreview,
  setPreviewTop,
}: {
  orientation?: "horizontal" | "vertical";
  isDragging: boolean;
  previewRef: React.RefObject<HTMLDivElement | null>;
  resetPreview: () => void;
  setPreviewTop: (top: number) => void;
}) {
  const editor = useEditorRef();
  const element = useElement();

  const handleMouseDown = (e: React.MouseEvent) => {
    resetPreview();

    if (e.button !== 0 || e.shiftKey) return;

    // Set mouse down state to prevent toolbar from showing
    editor.setOption(MultiDndPlugin, "isMouseDown", true);

    const blockSelection = editor
      .getApi(BlockSelectionPlugin)
      .blockSelection.getNodes({ sort: true });

    let selectionNodes =
      blockSelection.length > 0
        ? blockSelection
        : editor.api.blocks({ mode: "highest" });

    // If current block is not in selection, use it as the starting point
    if (!selectionNodes.some(([node]) => node.id === element.id)) {
      selectionNodes = [[element, editor.api.findPath(element)!]];
    }

    // Process selection nodes to include list children
    const blocks = expandListItemsWithChildren(editor, selectionNodes).map(
      ([node]) => node,
    );

    if (blockSelection.length === 0) {
      editor.tf.blur();
      editor.tf.collapse();
    }

    const elements = createDragPreviewElements(editor, blocks);
    previewRef.current?.append(...elements);
    previewRef.current?.classList.remove("hidden");
    previewRef.current?.classList.add("opacity-0");
    editor.setOption(DndPlugin, "multiplePreviewRef", previewRef);

    editor
      .getApi(BlockSelectionPlugin)
      .blockSelection.set(blocks.map((block) => block.id as string));
  };

  const handleMouseUp = () => {
    resetPreview();

    // Reset mouse down state to allow toolbar to show
    editor.setOption(MultiDndPlugin, "isMouseDown", false);

    // Show toolbar on mouse up (if not dragging)
    if (!isDragging) {
      editor.getApi(BlockSelectionPlugin).blockSelection.focus();
    }
  };

  const handleMouseEnter = () => {
    if (isDragging) return;

    const blockSelection = editor
      .getApi(BlockSelectionPlugin)
      .blockSelection.getNodes({ sort: true });

    let selectedBlocks =
      blockSelection.length > 0
        ? blockSelection
        : editor.api.blocks({ mode: "highest" });

    // If current block is not in selection, use it as the starting point
    if (!selectedBlocks.some(([node]) => node.id === element.id)) {
      selectedBlocks = [[element, editor.api.findPath(element)!]];
    }

    // Process selection to include list children
    const processedBlocks = expandListItemsWithChildren(editor, selectedBlocks);

    const ids = processedBlocks.map((block) => block[0].id as string);

    if (ids.length > 1 && ids.includes(element.id as string)) {
      const previewTop = calculatePreviewTop(editor, {
        blocks: processedBlocks.map((block) => block[0]),
        element,
      });
      setPreviewTop(previewTop);
    } else {
      setPreviewTop(0);
    }
  };

  return (
    <Tooltip delayDuration={1000}>
      <TooltipTrigger asChild>
        <div
          className="flex size-full items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseEnter={handleMouseEnter}
          role="button"
          data-plate-prevent-deselect
        >
          {orientation === "horizontal" ? (
            <GripHorizontal className="text-muted-foreground" />
          ) : (
            <GripVertical className="text-muted-foreground" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>Hold and drag to move, or click to edit</TooltipContent>
    </Tooltip>
  );
});

const DropLine = React.memo(function DropLine({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { dropLine } = useDropLine();

  if (!dropLine) return null;

  return (
    <div
      {...props}
      className={cn(
        "slate-dropLine",
        "absolute opacity-100 transition-opacity",
        "bg-blue-500",
        // Horizontal line styles for vertical drops
        (dropLine === "top" || dropLine === "bottom") && "inset-x-0 h-0.5",
        // Vertical line styles for horizontal drops
        (dropLine === "left" || dropLine === "right") && "inset-y-0 w-0.5",
        // Positioning
        dropLine === "top" && "-top-px",
        dropLine === "bottom" && "-bottom-px",
        dropLine === "left" && "-left-px",
        dropLine === "right" && "-right-px",
        className,
      )}
    />
  );
});

const createDragPreviewElements = (
  editor: PlateEditor,
  blocks: TElement[],
): HTMLElement[] => {
  const elements: HTMLElement[] = [];
  const ids: string[] = [];

  /**
   * Remove data attributes from the element to avoid recognized as slate
   * elements incorrectly.
   */
  const removeDataAttributes = (element: HTMLElement) => {
    Array.from(element.attributes).forEach((attr) => {
      if (
        attr.name.startsWith("data-slate") ||
        attr.name.startsWith("data-block-id")
      ) {
        element.removeAttribute(attr.name);
      }
    });

    Array.from(element.children).forEach((child) => {
      removeDataAttributes(child as HTMLElement);
    });
  };

  const resolveElement = (node: TElement, index: number) => {
    const domNode = editor.api.toDOMNode(node)!;
    const newDomNode = domNode.cloneNode(true) as HTMLElement;

    // Apply visual compensation for horizontal scroll
    const applyScrollCompensation = (
      original: Element,
      cloned: HTMLElement,
    ) => {
      const scrollLeft = original.scrollLeft;

      if (scrollLeft > 0) {
        // Create a wrapper to handle the scroll offset
        const scrollWrapper = document.createElement("div");
        scrollWrapper.style.overflow = "hidden";
        scrollWrapper.style.width = `${original.clientWidth}px`;

        // Create inner container with the full content
        const innerContainer = document.createElement("div");
        innerContainer.style.transform = `translateX(-${scrollLeft}px)`;
        innerContainer.style.width = `${original.scrollWidth}px`;

        // Move all children to the inner container
        while (cloned.firstChild) {
          innerContainer.append(cloned.firstChild);
        }

        // Apply the original element's styles to maintain appearance
        const originalStyles = window.getComputedStyle(original);
        cloned.style.padding = "0";
        innerContainer.style.padding = originalStyles.padding;

        scrollWrapper.append(innerContainer);
        cloned.append(scrollWrapper);
      }
    };

    applyScrollCompensation(domNode, newDomNode);

    ids.push(node.id as string);
    const wrapper = document.createElement("div");
    wrapper.append(newDomNode);
    wrapper.style.display = "flow-root";

    const lastDomNode = blocks[index - 1];

    if (lastDomNode) {
      const lastDomNodeRect = editor.api
        .toDOMNode(lastDomNode)!
        .parentElement!.getBoundingClientRect();

      const domNodeRect = domNode.parentElement!.getBoundingClientRect();

      const distance = domNodeRect.top - lastDomNodeRect.bottom;

      // Check if the two elements are adjacent (touching each other)
      if (distance > 15) {
        wrapper.style.marginTop = `${distance}px`;
      }
    }

    removeDataAttributes(newDomNode);
    elements.push(wrapper);
  };

  blocks.forEach((node, index) => resolveElement(node, index));

  editor.setOption(DndPlugin, "draggingId", ids);

  return elements;
};

const calculatePreviewTop = (
  editor: PlateEditor,
  {
    blocks,
    element,
  }: {
    blocks: TElement[];
    element: TElement;
  },
): number => {
  const child = editor.api.toDOMNode(element)!;
  const editable = editor.api.toDOMNode(editor)!;
  const firstSelectedChild = blocks[0]!;

  const firstDomNode = editor.api.toDOMNode(firstSelectedChild)!;
  // Get editor's top padding
  const editorPaddingTop = Number(
    window.getComputedStyle(editable).paddingTop.replace("px", ""),
  );

  // Calculate distance from first selected node to editor top
  const firstNodeToEditorDistance =
    firstDomNode.getBoundingClientRect().top -
    editable.getBoundingClientRect().top -
    editorPaddingTop;

  // Get margin top of first selected node
  const firstMarginTopString = window.getComputedStyle(firstDomNode).marginTop;
  const marginTop = Number(firstMarginTopString.replace("px", ""));

  // Calculate distance from current node to editor top
  const currentToEditorDistance =
    child.getBoundingClientRect().top -
    editable.getBoundingClientRect().top -
    editorPaddingTop;

  const currentMarginTopString = window.getComputedStyle(child).marginTop;
  const currentMarginTop = Number(currentMarginTopString.replace("px", ""));

  const previewElementsTopDistance =
    currentToEditorDistance -
    firstNodeToEditorDistance +
    marginTop -
    currentMarginTop;

  return previewElementsTopDistance;
};
