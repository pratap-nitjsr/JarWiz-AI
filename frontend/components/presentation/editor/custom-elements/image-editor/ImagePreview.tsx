"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  BASE_HEIGHT,
  BASE_WIDTH_PERCENTAGE,
} from "@/hooks/presentation/useRootImageActions";
import { Download, Image as ImageIcon } from "lucide-react";
import { type TElement } from "platejs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type RootImage as RootImageType } from "../../../utils/parser";
import { type ImageCropSettings } from "../../../utils/types";
import { type EditorMode } from "../presentation-image-editor";

interface ImagePreviewProps {
  element: TElement & RootImageType;
  currentMode: EditorMode;
  localCropSettings: ImageCropSettings;
  slideIndex: number;
  isRootImage: boolean;
  layoutType?: string;
  onCropSettingsChange: (settings: ImageCropSettings) => void;
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const MAX_HEIGHT_RATIO_WITH_WINDOW = 0.5;
const TOTAL_PADDING_FROM_SHEET = 110;
const XL_BREAKPOINT = 1280;
const MD_BREAKPOINT = 768;
const MAX_W_5XL = 1024;
const MAX_W_3XL = 768;
export function ImagePreview({
  element,
  currentMode,
  localCropSettings,
  slideIndex,
  layoutType,
  onCropSettingsChange,
  onUnsavedChanges,
}: ImagePreviewProps) {
  const zoom = useMemo(() => {
    const currentZoom = localCropSettings.zoom ?? 1;
    return Math.max(1, Math.min(2, currentZoom));
  }, [localCropSettings]);

  const setZoom = useCallback(
    (zoom: number) => {
      const clampedZoom = Math.max(1, Math.min(2, zoom));
      onCropSettingsChange({
        ...localCropSettings,
        zoom: clampedZoom,
      });
      onUnsavedChanges(true);
    },
    [localCropSettings, onCropSettingsChange, onUnsavedChanges],
  );

  // Custom crop state for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastObjectPosition, setLastObjectPosition] = useState({
    x: localCropSettings.objectPosition.x,
    y: localCropSettings.objectPosition.y,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent default behavior
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastObjectPosition({
        x: localCropSettings.objectPosition.x,
        y: localCropSettings.objectPosition.y,
      });
    },
    [localCropSettings.objectPosition],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      e.preventDefault(); // Prevent text selection

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Get container dimensions
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Convert pixel movement to percentage with increased sensitivity (3x faster)
      const deltaXPercent = (deltaX / containerWidth) * 100 * 3;
      const deltaYPercent = (deltaY / containerHeight) * 100 * 3;

      // Calculate new object position
      const newX = Math.max(
        0,
        Math.min(100, lastObjectPosition.x + deltaXPercent),
      );
      const newY = Math.max(
        0,
        Math.min(100, lastObjectPosition.y + deltaYPercent),
      );

      onCropSettingsChange({
        ...localCropSettings,
        objectPosition: { x: newX, y: newY },
      });
    },
    [
      isDragging,
      dragStart,
      lastObjectPosition,
      localCropSettings,
      onCropSettingsChange,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onUnsavedChanges(true);
    }
  }, [isDragging, onUnsavedChanges]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.01 : 0.01;
      const newZoom = Math.max(1, Math.min(2, zoom + delta));

      setZoom(newZoom);
    },
    [zoom, setZoom],
  );

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const preventSelection = (e: Event) => e.preventDefault();

      // Add global event listeners
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("selectstart", preventSelection);
      document.addEventListener("dragstart", preventSelection);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("selectstart", preventSelection);
        document.removeEventListener("dragstart", preventSelection);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const imageDimensionInPresentation = useMemo(() => {
    const slideContainer = document.querySelector(
      `.slide-container-${slideIndex}`,
    );

    if (!slideContainer) {
      return { width: 400, height: 300 };
    }

    const parentRect = slideContainer.getBoundingClientRect();
    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;

    const BASE_WIDTH_PERCENTAGE_NUMERICAL =
      parseFloat(BASE_WIDTH_PERCENTAGE) / 100;
    // Calculate actual pixel dimensions based on the style
    let actualWidth: number = parentWidth * BASE_WIDTH_PERCENTAGE_NUMERICAL;
    let actualHeight: number = 384;

    if (layoutType === "vertical") {
      actualHeight = element.size?.h ?? BASE_HEIGHT;
      actualWidth = parentWidth;
    } else {
      actualWidth =
        parentWidth *
        (parseFloat(element.size?.w ?? BASE_WIDTH_PERCENTAGE) / 100);
      actualHeight = parentHeight;
    }

    console.log("actualWidth", actualWidth, "actualHeight", actualHeight);
    return { width: actualWidth, height: actualHeight };
  }, [slideIndex]);

  const containerScale = useMemo(() => {
    const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO_WITH_WINDOW;
    // Calculate responsive max-width based on window width, matching sheet classes: max-w-full md:max-w-3xl xl:max-w-5xl
    const windowWidth = window.innerWidth - TOTAL_PADDING_FROM_SHEET;
    let maxWidth: number;
    if (windowWidth >= XL_BREAKPOINT) {
      maxWidth = MAX_W_5XL - TOTAL_PADDING_FROM_SHEET; // xl:max-w-5xl (64rem = 1024px)
    } else if (windowWidth >= MD_BREAKPOINT) {
      maxWidth = MAX_W_3XL - TOTAL_PADDING_FROM_SHEET; // md:max-w-3xl (48rem = 768px)
    } else {
      maxWidth = windowWidth; // max-w-full (full width for small screens)
    }
    console.log("maxWidth", maxWidth, "maxHeight", maxHeight);

    let heightFits = imageDimensionInPresentation.height <= maxHeight;
    let widthFits = imageDimensionInPresentation.width <= maxWidth;
    // Check if both dimensions fit without scaling
    if (heightFits && widthFits) {
      return 1;
    }

    let scale = 1;

    for (let i = 0; i < 50; i++) {
      scale -= 0.02;
      heightFits = imageDimensionInPresentation.height * scale <= maxHeight;
      widthFits = imageDimensionInPresentation.width * scale <= maxWidth;
      if (heightFits && widthFits) {
        return scale;
      }
    }

    const heightScale = maxHeight / imageDimensionInPresentation.height;
    const widthScale = maxWidth / imageDimensionInPresentation.width;
    return Math.min(heightScale, widthScale);
  }, [imageDimensionInPresentation]);

  // Debug logging for container dimensions
  useEffect(() => {
    console.log("Container dimensions:", {
      width: imageDimensionInPresentation.width * containerScale,
      height: imageDimensionInPresentation.height * containerScale,
      containerScale,
      imageDimensions: imageDimensionInPresentation,
    });
  }, [imageDimensionInPresentation, containerScale]);

  const handleDownload = useCallback(async () => {
    if (!element.url) return;
    try {
      const response = await fetch(element.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  }, [element.url]);

  if (!element.url) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-10 w-10 opacity-50" />
          <span>No image generated yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Image Preview Area */}
      <div className="relative max-h-[50vh] flex justify-center items-center w-full overflow-hidden">
        {currentMode === "crop" ? (
          <div
            ref={containerRef}
            className="relative shrink-0 rounded-lg bg-gradient-to-br aspect-auto from-muted/50 to-muted overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{
              width: imageDimensionInPresentation.width * containerScale,
              height: imageDimensionInPresentation.height * containerScale,
              aspectRatio:
                imageDimensionInPresentation.width /
                imageDimensionInPresentation.height,
              transformOrigin: "center center",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              overflow: "visible",
            }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onDragStart={(e) => e.preventDefault()}
          >
            {/** biome-ignore lint/performance/noImgElement: This is a valid use case */}
            <img
              src={element.url}
              alt={element.query ?? "Presentation image"}
              style={{
                height: "100%",
                width: "100%",
                objectFit: localCropSettings.objectFit,
                objectPosition: `${localCropSettings.objectPosition.x}% ${localCropSettings.objectPosition.y}%`,
                transform: `scale(${localCropSettings.zoom ?? 1})`,
                transformOrigin: `${localCropSettings.objectPosition.x}% ${localCropSettings.objectPosition.y}%`,
                pointerEvents: "none", // Prevent image from interfering with mouse events
                display: "block", // Remove any default inline spacing
                maxWidth: "none", // Prevent any max-width constraints
                maxHeight: "none", // Prevent any max-height constraints
              }}
              draggable={false}
            />
            {/* Crop overlay */}
            <div className="absolute inset-0 border-2 border-blue-500 border-dashed pointer-events-none">
              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-sm">
                Drag to pan • Scroll to zoom
              </div>
            </div>
          </div>
        ) : (
          // Normal Preview Mode - Show cropped preview
          <div
            className="relative overflow-hidden shrink-0 rounded-lg bg-gradient-to-br aspect-auto from-muted/50 to-muted"
            style={{
              ...imageDimensionInPresentation,
              scale: containerScale,
              transformOrigin: "center center",
            }}
          >
            {/** biome-ignore lint/performance/noImgElement: This is a valid use case */}
            <img
              src={element.url}
              alt={element.query ?? "Presentation image"}
              style={{
                height: "100%",
                width: "100%",
                objectFit: localCropSettings.objectFit,
                objectPosition: `${localCropSettings.objectPosition.x}% ${localCropSettings.objectPosition.y}%`,
                transform: `scale(${localCropSettings.zoom ?? 1})`,
                transformOrigin: `${localCropSettings.objectPosition.x}% ${localCropSettings.objectPosition.y}%`,
              }}
              draggable={false}
            />
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Crop Controls - Only show in crop mode */}
      {currentMode === "crop" && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Crop Controls</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Position: {localCropSettings.objectPosition.x.toFixed(0)}%,{" "}
                  {localCropSettings.objectPosition.y.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Zoom Level</label>
                <span className="text-sm text-muted-foreground">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value ?? 1)}
                min={1}
                max={2}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1x</span>
                <span>2x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
