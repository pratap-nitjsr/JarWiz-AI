"use client";

import { previewSignature } from "@/hooks/presentation/previewSignature";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { Resizable } from "re-resizable";
import React, { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePresentationSlides } from "@/hooks/presentation/usePresentationSlides";
import { usePresentationState } from "@/states/presentation-state";
import PresentationEditorStaticView from "../editor/presentation-editor-static";
import { type PlateSlide } from "../utils/parser";
import { SlidePreviewCard } from "./SlidePreviewCard";

interface SlidePreviewProps {
  onSlideClick?: (index: number) => void;
  currentSlideIndex?: number;
  showSidebar?: boolean;
}

function SlidePreviewBase({
  onSlideClick,
  currentSlideIndex: currentSlideIndexProp,
  showSidebar = true,
}: SlidePreviewProps) {
  const slides = usePresentationState((s) => s.slides);
  const stateCurrentSlideIndex = usePresentationState(
    (s) => s.currentSlideIndex,
  );
  const setCurrentSlideIndex = usePresentationState(
    (s) => s.setCurrentSlideIndex,
  );
  const isSidebarCollapsed = usePresentationState((s) => s.isSidebarCollapsed);
  const setIsSidebarCollapsed = usePresentationState(
    (s) => s.setIsSidebarCollapsed,
  );

  const effectiveCurrentSlideIndex =
    typeof currentSlideIndexProp === "number"
      ? currentSlideIndexProp
      : stateCurrentSlideIndex;

  const [sidebarWidth, setSidebarWidth] = useState(150);
  const { scrollToSlide } = usePresentationSlides();

  const handleSlideClick = useCallback(
    (index: number) => {
      if (onSlideClick) {
        onSlideClick(index);
      } else {
        setCurrentSlideIndex(index);
        scrollToSlide(index);
      }
    },
    [onSlideClick, scrollToSlide, setCurrentSlideIndex],
  );

  const handleResize = useCallback(
    (_e: unknown, _direction: unknown, _ref: unknown, d: { width: number }) => {
      setSidebarWidth((prev) => prev + d.width);
    },
    [],
  );

  return (
    <div className="flex h-full items-center">
      <div className="flex h-full items-center">
        <AnimatePresence>
          {showSidebar && !isSidebarCollapsed && (
            <motion.div
              initial={{
                scale: 1,
                width: "auto",
                opacity: 1,
                x: "-100%",
                originX: 0.5,
                originY: 0.5,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                scale: 0,
                width: 0,
                opacity: 0,
                originX: 0.5,
                originY: 0.5,
              }}
              transition={{
                duration: 0.35,
                opacity: { duration: 0.25 },
              }}
              className="overflow-hidden"
            >
              <Resizable
                size={{ width: sidebarWidth }}
                minWidth={100}
                maxWidth={300}
                enable={{ right: true }}
                onResizeStop={handleResize}
                handleComponent={{
                  right: (
                    <div className="group/resize relative flex h-full w-1 cursor-col-resize bg-border">
                      <GripVertical className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover/resize:opacity-100" />
                    </div>
                  ),
                }}
              >
                <div className="h-max max-h-[90vh] overflow-auto">
                  <div className="flex flex-col space-y-4 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Slides</h2>

                      <Button
                        onClick={() => setIsSidebarCollapsed(true)}
                        variant="ghost"
                        size="sm"
                      >
                        <PanelRightOpen className="size-3" />
                      </Button>
                    </div>
                    <div className="flex flex-col space-y-4">
                      {slides.map((slide, index) => (
                        <MemoPreviewItem
                          key={slide.id}
                          index={index}
                          isActive={effectiveCurrentSlideIndex === index}
                          onClick={handleSlideClick}
                          slideId={slide.id}
                          slide={slide}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Resizable>
            </motion.div>
          )}
        </AnimatePresence>

        {showSidebar && isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: "0.5rem" }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              opacity: { duration: 0.4, delay: 0.1 },
            }}
          >
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="rounded-md border border-[var(--presentation-primary)] px-1 py-2"
            >
              <PanelLeftOpen className="size-5 text-sm" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// moved to hooks/presentation/previewSignature

const MemoPreviewItem = React.memo(
  function PreviewItem({
    index,
    isActive,
    onClick,
    slideId,
    slide,
  }: {
    index: number;
    isActive: boolean;
    onClick: (index: number) => void;
    slideId: string;
    slide: PlateSlide;
  }) {
    const handleClick = useCallback(() => onClick(index), [onClick, index]);
    return (
      <SlidePreviewCard index={index} isActive={isActive} onClick={handleClick}>
        <PresentationEditorStaticView
          initialContent={slide}
          className="min-h-[300px] border"
          id={`preview-${slideId}`}
        />
      </SlidePreviewCard>
    );
  },
  (prev, next) => {
    if (prev.index !== next.index) return false;
    if (prev.isActive !== next.isActive) return false;
    if (prev.slideId !== next.slideId) return false;
    if (previewSignature(prev.slide) !== previewSignature(next.slide))
      return false;
    return true;
  },
);

export const SlidePreview = React.memo(SlidePreviewBase);
