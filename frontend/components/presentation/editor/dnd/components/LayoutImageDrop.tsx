import { type LayoutType } from "@/components/presentation/utils/parser";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { DRAG_ITEM_BLOCK } from "@platejs/dnd";
import { ImagePlugin } from "@platejs/media/react";
import { type TElement } from "platejs";
import { useEditorRef, type PlateEditor } from "platejs/react";
import { useRef } from "react";
import { useDrop } from "react-dnd";

function removeNodeById(editor: PlateEditor, element: TElement) {
  const path = editor.api.findPath(element);

  if (!path) return;
  editor.tf.removeNodes({ at: path });
  return element;
}

export default function LayoutImageDrop({
  slideIndex,
}: {
  slideIndex: number;
}) {
  // Create drop zones for top, left, and right
  const topRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const editor = useEditorRef();

  const handleImageDrop = (
    item: { element: TElement },
    layoutType: LayoutType,
  ) => {
    // Only handle image elements
    if (item?.element?.type !== ImagePlugin.key) return;

    // Store the image URL and query
    let imageUrl = item.element.url as string;
    let imageQuery = item.element.query as string;

    // Check if the image is from the editor and needs to be removed
    const element = removeNodeById(editor, item.element);
    if (element?.url) imageUrl = element.url as string;
    if (element?.query) imageQuery = element.query as string;

    // Get the current slides state
    const { slides, setSlides, setCurrentSlideIndex } =
      usePresentationState.getState();

    // Update the slides array with the new root image and layout type
    const updatedSlides = slides.map((slide, index) => {
      if (index === slideIndex) {
        return {
          ...slide,
          rootImage: {
            url: imageUrl,
            query: imageQuery,
          },
          layoutType: layoutType,
        };
      }
      return slide;
    });

    // Update the slides state and current slide index
    setSlides(updatedSlides);
    setCurrentSlideIndex(slideIndex);
  };

  // Setup drop zones
  const [{ isTopOver }, dropTop] = useDrop({
    accept: [DRAG_ITEM_BLOCK],
    canDrop: (item: { element: TElement }) =>
      item.element.type === ImagePlugin.key,
    drop: (item) => {
      handleImageDrop(item, "vertical");
      return { droppedInLayoutZone: true }; // Add this return value
    },
    collect: (monitor) => ({
      isTopOver: monitor.isOver() && monitor.canDrop(),
    }),
  });

  const [{ isLeftOver }, dropLeft] = useDrop({
    accept: [DRAG_ITEM_BLOCK],
    canDrop: (item: { element: TElement }) =>
      item?.element?.type === ImagePlugin.key,
    drop: (item) => {
      handleImageDrop(item, "left");
      return { droppedInLayoutZone: true }; // Add this return value
    },
    collect: (monitor) => ({
      isLeftOver: monitor.isOver() && monitor.canDrop(),
    }),
  });

  const [{ isRightOver }, dropRight] = useDrop({
    accept: [DRAG_ITEM_BLOCK],
    canDrop: (item: { element: TElement }) =>
      item.element.type === ImagePlugin.key,
    drop: (item) => {
      handleImageDrop(item, "right");
      return { droppedInLayoutZone: true }; // Add this return value
    },
    collect: (monitor) => ({
      isRightOver: monitor.isOver() && monitor.canDrop(),
    }),
  });
  // Connect the drop refs
  dropTop(topRef);
  dropLeft(leftRef);
  dropRight(rightRef);

  return (
    <>
      {/* Top drop zone */}
      <div
        ref={topRef}
        className={cn(
          "absolute left-0 right-0 top-0 z-50 h-16",
          isTopOver ? "bg-primary/20" : "bg-transparent",
          "transition-colors duration-200",
        )}
      />

      {/* Left drop zone */}
      <div
        ref={leftRef}
        className={cn(
          "absolute bottom-0 left-0 top-16 z-50 w-8",
          isLeftOver ? "bg-primary/20" : "bg-transparent",
          "transition-colors duration-200",
        )}
      />

      {/* Right drop zone */}
      <div
        ref={rightRef}
        className={cn(
          "absolute bottom-0 right-0 top-16 z-50 w-8",
          isRightOver ? "bg-primary/20" : "bg-transparent",
          "transition-colors duration-200",
        )}
      />
    </>
  );
}
