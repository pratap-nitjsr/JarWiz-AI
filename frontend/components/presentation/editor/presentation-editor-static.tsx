"use client";
import { createSlateEditor, type Value } from "platejs";
import React, { useEffect, useMemo } from "react";

import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { type PlateSlide } from "../utils/parser";
import { EditorStatic } from "./custom-elements/static/editor-static";
import RootImageStatic from "./custom-elements/static/root-image-static";
import { PresentationEditorBaseKit } from "./plugins/presentation-editor-base-kit";
import { PresentationStaticCustomKit } from "./plugins/static-custom-kit";
import { PresentationStaticComponents } from "./plugins/static-kit";

interface PresentationEditorStaticViewProps {
  initialContent?: PlateSlide;
  className?: string;
  id?: string;
}

function slideSignature(slide?: PlateSlide): string {
  try {
    return JSON.stringify({
      id: slide?.id,
      content: slide?.content,
      alignment: slide?.alignment,
      layoutType: slide?.layoutType,
      width: slide?.width,
      rootImage: slide?.rootImage,
      bgColor: slide?.bgColor,
    });
  } catch {
    return String(slide?.id ?? "");
  }
}

const PresentationEditorStaticView = React.memo(
  ({ initialContent, className, id }: PresentationEditorStaticViewProps) => {
    const { isPresenting } = usePresentationState();
    const editor = useMemo(
      () =>
        createSlateEditor({
          plugins: [
            ...PresentationEditorBaseKit,
            ...PresentationStaticCustomKit,
          ],
          components: PresentationStaticComponents,
          value: initialContent?.content ?? ([] as Value),
        }),
      [],
    );

    // Keep value in sync without recreating editor
    useEffect(() => {
      if (!initialContent?.content) return;
      editor.tf.setValue(initialContent.content);
    }, [editor, initialContent?.content]);

    return (
      <div
        className={cn(
          "flex min-h-[500px] w-full",
          "scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 overflow-hidden p-0 scrollbar-thin scrollbar-track-transparent",
          "relative text-foreground",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-50",
          className,
          initialContent?.layoutType === "right" && "flex-row",
          initialContent?.layoutType === "vertical" && "flex-col-reverse",
          initialContent?.layoutType === "left" && "flex-row-reverse",
          initialContent?.layoutType === "background" && "flex-col",
          "presentation-slide",
        )}
        style={{
          borderRadius: "var(--presentation-border-radius, 0.5rem)",
          backgroundColor: initialContent?.bgColor || undefined,
          backgroundImage:
            initialContent?.layoutType === "background" &&
            initialContent?.rootImage?.url
              ? `url(${initialContent.rootImage.url})`
              : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        data-is-presenting={isPresenting ? "true" : "false"}
        data-slide-content="true"
      >
        <EditorStatic
          className={cn(
            className,
            "flex flex-col border-none !bg-transparent p-12 outline-none h-full",
            initialContent?.alignment === "start" && "justify-start",
            initialContent?.alignment === "center" && "justify-center",
            initialContent?.alignment === "end" && "justify-end",
          )}
          id={id}
          editor={editor}
        />

        {initialContent?.rootImage &&
          initialContent.layoutType !== undefined &&
          initialContent.layoutType !== "background" && (
            <RootImageStatic
              image={initialContent.rootImage}
              layoutType={initialContent.layoutType}
              slideId={initialContent.id}
            />
          )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.id !== next.id) return false;
    if (
      slideSignature(prev.initialContent) !==
      slideSignature(next.initialContent)
    )
      return false;
    if (prev.className !== next.className) return false;
    return true;
  },
);

export default PresentationEditorStaticView;
