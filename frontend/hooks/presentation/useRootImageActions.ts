"use client";

import { useDraggable } from "@/components/presentation/editor/dnd/hooks/useDraggable";
import {
  type LayoutType,
  type PlateSlide,
  type RootImage,
} from "@/components/presentation/utils/parser";
import { type ImageCropSettings } from "@/components/presentation/utils/types";
import { useDebouncedSave } from "@/hooks/presentation/useDebouncedSave";
import { usePresentationState } from "@/states/presentation-state";
import { DndPlugin, type DragItemNode } from "@platejs/dnd";
import { ImagePlugin } from "@platejs/media/react";
import { useEditorRef } from "platejs/react";
import { useCallback, useId, useMemo, useState } from "react";
import { type DragSourceMonitor } from "react-dnd";

export const BASE_WIDTH_PERCENTAGE = "45%";
export const BASE_HEIGHT = 384;

type UseRootImageActionsOptions = {
  image?: RootImage;
  layoutType?: LayoutType | string;
  slideId?: string;
};

export function useRootImageActions(
  slideIndex: number,
  options: UseRootImageActionsOptions = {},
) {
  const { image, layoutType, slideId } = options;

  const setSlides = usePresentationState((s) => s.setSlides);
  const startRootImageGeneration = usePresentationState(
    (s) => s.startRootImageGeneration,
  );
  const rootImageGeneration = usePresentationState(
    (s) => s.rootImageGeneration,
  );
  const { saveImmediately } = useDebouncedSave();

  const editor = useEditorRef();

  // Local size state mirrors persisted size, initializes from provided image
  const [size, setSize] = useState<{ w?: string; h?: number }>(() => ({
    w: image?.size?.w ?? undefined,
    h: image?.size?.h ?? undefined,
  }));

  const computedGen = useMemo(
    () => (slideId ? rootImageGeneration[slideId] : undefined),
    [rootImageGeneration, slideId],
  );
  const computedImageUrl = useMemo(
    () => computedGen?.url ?? image?.url,
    [computedGen?.url, image?.url],
  );

  // Get crop settings from image or use defaults
  const cropSettings: ImageCropSettings = useMemo(
    () =>
      image?.cropSettings || {
        objectFit: "cover",
        objectPosition: { x: 50, y: 50 },
        zoom: 1,
      },
    [image?.cropSettings],
  );

  // Derived styles
  const imageStyles: React.CSSProperties = useMemo(
    () => ({
      objectFit: cropSettings.objectFit,
      objectPosition: `${cropSettings.objectPosition.x}% ${cropSettings.objectPosition.y}%`,
      transform: `scale(${cropSettings.zoom ?? 1})`,
      transformOrigin: `${cropSettings.objectPosition.x}% ${cropSettings.objectPosition.y}%`,
      height: "100%",
      width: "100%",
      display: "block",
    }),
    [cropSettings],
  );

  const sizeStyle: React.CSSProperties = useMemo(() => {
    if (!size.h && !size.w) {
      if (layoutType === "vertical") {
        return { height: BASE_HEIGHT, width: "100%" } as const;
      }
      return { width: BASE_WIDTH_PERCENTAGE } as const;
    }
    if (layoutType === "vertical") {
      return { height: size.h, width: "100%" } as const;
    }
    return { width: size.w } as const;
  }, [layoutType, size.h, size.w]);

  // Actions
  const updateCropSettings = useCallback(
    (settings: ImageCropSettings) => {
      const { slides } = usePresentationState.getState();
      const updatedSlides = slides.map((slide: PlateSlide, index: number) => {
        if (index === slideIndex) {
          return {
            ...slide,
            rootImage: {
              ...slide.rootImage!,
              cropSettings: settings,
            },
          };
        }
        return slide;
      });
      setSlides(updatedSlides);
      setTimeout(() => {
        void saveImmediately();
      }, 100);
    },
    [saveImmediately, setSlides, slideIndex],
  );

  const replaceImageUrl = useCallback(
    (url: string, query: string) => {
      const { slides } = usePresentationState.getState();
      const resetCrop: ImageCropSettings = {
        objectFit: "cover",
        objectPosition: { x: 50, y: 50 },
        zoom: 1,
      };
      const updatedSlides = slides.map((slide: PlateSlide, index: number) => {
        if (index === slideIndex) {
          return {
            ...slide,
            rootImage: {
              ...(slide.rootImage ?? { query }),
              url,
              cropSettings: resetCrop,
            },
          };
        }
        return slide;
      });
      setSlides(updatedSlides);
      void saveImmediately();
    },
    [saveImmediately, setSlides, slideIndex],
  );

  const removeRootImage = useCallback(
    (matchUrls?: string[]) => {
      const { slides } = usePresentationState.getState();
      const updatedSlides = slides.map((slide: PlateSlide, index: number) => {
        if (index === slideIndex) {
          if (!slide.rootImage) return slide;
          if (matchUrls && !matchUrls.includes(slide.rootImage.url ?? "")) {
            return slide;
          }
          const { rootImage: _rootImage, ...rest } = slide as PlateSlide & {
            rootImage?: PlateSlide["rootImage"];
          };
          return rest as PlateSlide;
        }
        return slide;
      });
      setSlides(updatedSlides);
    },
    [setSlides, slideIndex],
  );

  const removeRootImageFromSlide = useCallback(() => {
    const urls = [image?.url, computedImageUrl].filter((u): u is string =>
      Boolean(u),
    );
    removeRootImage(urls);
  }, [computedImageUrl, image?.url, removeRootImage]);

  const updateRootImageSize = useCallback(
    (newSize: { w?: string; h?: number }) => {
      const { slides } = usePresentationState.getState();
      const updatedSlides = slides.map((slide: PlateSlide, index: number) => {
        if (index === slideIndex) {
          return {
            ...slide,
            rootImage: { ...slide.rootImage!, size: newSize },
          };
        }
        return slide;
      });
      setSlides(updatedSlides);
      void saveImmediately();
    },
    [setSlides, slideIndex],
  );

  // Resizable handler logic moved here
  const onResizeStop = useCallback(
    (
      _e: unknown,
      _direction: unknown,
      _ref: HTMLElement,
      d: { width: number; height: number },
    ) => {
      if (layoutType === "vertical") {
        const nextHeight = (size?.h ?? BASE_HEIGHT) + d.height;
        setSize({ h: nextHeight });
        updateRootImageSize({ h: nextHeight });
      } else {
        const parentElementRect = _ref.parentElement!.getBoundingClientRect();
        const parentWidth = parentElementRect.width;
        const width = parseFloat(size?.w ?? BASE_WIDTH_PERCENTAGE);
        const originalWidth = parentWidth * (width / 100);
        const changeInWidth = d.width;
        const newWidth = originalWidth + changeInWidth;
        const newWidthPercentage = (newWidth / parentWidth) * 100;
        const nextWidth = `${newWidthPercentage}%`;
        setSize({ w: nextWidth });
        updateRootImageSize({ w: nextWidth });
      }
    },
    [layoutType, size?.h, size?.w, updateRootImageSize],
  );

  // Drag-and-drop logic moved here
  const id = useId();
  const dragElement = useMemo(
    () => ({
      id: id,
      type: ImagePlugin.key,
      url: computedImageUrl,
      query: image?.query,
      cropSettings: cropSettings,
      children: [{ text: "" }],
    }),
    [computedImageUrl, cropSettings, id, image?.query],
  );

  const onDragEnd = useCallback(
    (_item: DragItemNode, monitor: DragSourceMonitor) => {
      const dropResult: { droppedInLayoutZone: boolean } =
        monitor.getDropResult()!;
      if (monitor.didDrop() && !dropResult?.droppedInLayoutZone) {
        removeRootImageFromSlide();
      }
      editor.setOption(DndPlugin, "isDragging", false);
    },
    [editor, removeRootImageFromSlide],
  );

  const { isDragging, handleRef } = useDraggable({
    element: dragElement,
    drag: { end: onDragEnd },
  });

  return {
    // Derived data
    computedGen,
    computedImageUrl,
    cropSettings,
    imageStyles,
    sizeStyle,
    isDragging,
    handleRef,

    // Actions
    startRootImageGeneration,
    updateCropSettings,
    replaceImageUrl,
    removeRootImage,
    removeRootImageFromSlide,
    updateRootImageSize,
    onResizeStop,
  };
}
