"use client";

import { PlateElement, useEditorRef, withHOC, withRef } from "platejs/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { generateImageAction } from "@/app/_actions/image/generate";
import { getImageFromUnsplash } from "@/app/_actions/image/unsplash";
import { MediaToolbar } from "@/components/plate/ui/media-toolbar";
import { mediaResizeHandleVariants } from "@/components/plate/ui/resize-handle";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedSave } from "@/hooks/presentation/useDebouncedSave";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { Image, ImagePlugin, useMediaState } from "@platejs/media/react";
import { Resizable, ResizableProvider, ResizeHandle } from "@platejs/resizable";
import { type TImageElement } from "platejs";
import { type RootImage } from "../../utils/parser";
import { type ImageCropSettings } from "../../utils/types";
import { useDraggable } from "../dnd/hooks/useDraggable";
import { PresentationImageEditor } from "./presentation-image-editor";

// ImageCropSettings imported from shared types; includes optional zoom

export interface PresentationImageElementProps {
  className?: string;
  children?: React.ReactNode;
  nodeProps?: Record<string, unknown>;
  element: TImageElement & {
    query?: string;
    cropSettings?: ImageCropSettings;
  };
}

export const PresentationImageElement = withHOC(
  ResizableProvider,
  withRef<typeof PlateElement, PresentationImageElementProps>(
    ({ children, className, nodeProps, ...props }, ref) => {
      const { align = "center", focused, readOnly, selected } = useMediaState();
      const { isDragging, handleRef } = useDraggable({
        element: props.element,
      });
      const imageRef = useRef<HTMLDivElement | null>(null);
      const editor = useEditorRef();
      const { saveImmediately } = useDebouncedSave();
      const [isSheetOpen, setIsSheetOpen] = useState(false);
      const [isGenerating, setIsGenerating] = useState(false);
      const [imageUrl, setImageUrl] = useState<string | undefined>(
        props.element.url,
      );

      const imageSource = usePresentationState((s) => s.imageSource);
      const imageModel = usePresentationState((s) => s.imageModel);
      const hasHandledGenerationRef = useRef(false);

      // Get crop settings from element or use defaults
      const cropSettings: ImageCropSettings = props.element.cropSettings || {
        objectFit: "cover",
        objectPosition: { x: 50, y: 50 },
        zoom: 1,
      };

      const generateImage = async (prompt: string) => {
        const container = document.querySelector(".presentation-slides");
        const isEditorReadOnly = !container?.contains(imageRef?.current);
        // Prevent image generation in read-only mode
        console.log(isEditorReadOnly, hasHandledGenerationRef.current);
        if (isEditorReadOnly) {
          return;
        }
        setIsGenerating(true);
        try {
          hasHandledGenerationRef.current = true;
          let result;

          if (imageSource === "stock") {
            // Use Unsplash for stock images
            const unsplashResult = await getImageFromUnsplash(prompt);
            if (unsplashResult.success && unsplashResult.imageUrl) {
              result = {
                success: true,
                image: { url: unsplashResult.imageUrl },
              };
            }
          } else {
            // Use AI generation
            result = await generateImageAction(prompt, imageModel);
          }

          if (
            result &&
            typeof result === "object" &&
            "success" in result &&
            result.success === true &&
            result.image?.url
          ) {
            const newImageUrl = result.image.url;
            setImageUrl(newImageUrl);

            // Update the element's URL and query in the editor
            editor.tf.setNodes<TImageElement>({
              ...props.element,
              url: newImageUrl,
              query: prompt,
              cropSettings: cropSettings, // Preserve crop settings
            });

            // Force an immediate save to ensure the image URL is persisted
            setTimeout(() => {
              void saveImmediately();
            }, 500);
          }
        } catch (error) {
          console.error("Error generating image:", error);
        } finally {
          setIsGenerating(false);
        }
      };

      // Generate image if query is provided but no URL exists
      useEffect(() => {
        // Skip if in read-only mode, we've already handled this element, or if there's no query or if URL already exists
        if (
          hasHandledGenerationRef.current ||
          !props.element.query ||
          props.element.url ||
          imageUrl
        ) {
          return;
        }

        // Use the same generateImage function we defined above
        if (props.element.query) {
          void generateImage(props.element.query);
        }
      }, [
        props.element.query,
        props.element.url,
        imageUrl,
        props.element.setNodeValue,
      ]);

      // Apply crop settings to the image
      const imageStyles: React.CSSProperties = {
        objectFit: cropSettings.objectFit,
        objectPosition: `${cropSettings.objectPosition.x}% ${cropSettings.objectPosition.y}%`,
        transform: `scale(${cropSettings.zoom ?? 1})`,
        transformOrigin: `${cropSettings.objectPosition.x}% ${cropSettings.objectPosition.y}%`,
      };

      return (
        <>
          <MediaToolbar plugin={ImagePlugin}>
            <PlateElement ref={ref} className={cn(className)} {...props}>
              <div ref={imageRef}>
                <Resizable
                  options={{
                    align,
                    readOnly,
                  }}
                >
                  <ResizeHandle
                    className={mediaResizeHandleVariants({ direction: "left" })}
                    options={{ direction: "left" }}
                  />
                  {isGenerating ? (
                    <div className="relative w-full">
                      <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-muted">
                        <div className="flex flex-col items-center gap-2">
                          <Spinner className="h-6 w-6" />
                          <span className="text-sm text-muted-foreground">
                            Generating image...
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="presentation-image-container"
                      onDoubleClick={() => {
                        if (!readOnly) {
                          setIsSheetOpen(true);
                        }
                      }}
                    >
                      <Image
                        ref={handleRef}
                        className={cn(
                          "presentation-image",
                          "cursor-pointer",
                          focused &&
                            selected &&
                            "ring-2 ring-ring ring-offset-2",
                          isDragging && "opacity-50",
                        )}
                        alt={props.element.query ?? ""}
                        src={imageUrl}
                        style={imageStyles} // Add crop styles
                        onError={(e) => {
                          console.error(
                            "Presentation image failed to load:",
                            e,
                            imageUrl,
                          );
                        }}
                        {...nodeProps}
                      />
                    </div>
                  )}
                  <ResizeHandle
                    className={mediaResizeHandleVariants({
                      direction: "right",
                    })}
                    options={{ direction: "right" }}
                  />
                  {children}
                </Resizable>
              </div>
            </PlateElement>
          </MediaToolbar>

          {/* Image Editor Sheet */}
          <PresentationImageEditor
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            element={
              {
                ...props.element,
                type: "rootImage",
                children: [],
              } as TImageElement & RootImage
            }
            layoutType={""}
            slideIndex={0}
            isRootImage={false}
          />
        </>
      );
    },
  ),
);
