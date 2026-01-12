"use client";

import {
  generateImageAction,
  type ImageModelList,
} from "@/app/_actions/image/generate";
import { ImageSourceSelector } from "@/components/presentation/theme/ImageSourceSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePresentationState } from "@/states/presentation-state";
import { AlertTriangle, RefreshCw, Wand2 } from "lucide-react";
import { type TElement } from "platejs";
import { useEditorRef } from "platejs/react";
import { useEffect, useState } from "react";
import { type RootImage as RootImageType } from "../../../utils/parser";

interface GenerateControlsProps {
  element: TElement & RootImageType;
  slideIndex: number;
  isRootImage: boolean;
}

export function GenerateControls({
  element,
  slideIndex,
  isRootImage,
}: GenerateControlsProps) {
  const editor = useEditorRef();
  const {
    imageModel,
    setImageModel,
    imageSource,
    setImageSource,
    stockImageProvider,
    setStockImageProvider,
  } = usePresentationState();
  const [newPrompt, setNewPrompt] = useState(element.query ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  // Update prompt when element changes
  useEffect(() => {
    setNewPrompt(element.query ?? "");
  }, [element.query]);

  const handleGenerateClick = async () => {
    if (!newPrompt.trim()) return;

    setLocalError(null);
    try {
      const result = await generateImageAction(
        newPrompt,
        imageModel as ImageModelList,
      );
      if (result.success && result.image) {
        // Update the element using the editor or global state
        const { slides, setSlides } = usePresentationState.getState();
        if (isRootImage) {
          setSlides(
            slides.map((slide, index) =>
              index === slideIndex
                ? {
                    ...slide,
                    rootImage: {
                      ...slide.rootImage!,
                      url: result.image.url,
                      query: newPrompt,
                    },
                  }
                : slide,
            ),
          );
        } else {
          editor.tf.setNodes(
            { url: result.image.url, query: newPrompt },
            { at: editor.api.findPath(element) },
          );
        }
      } else {
        setLocalError(result.error ?? "Failed to generate image");
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to generate image",
      );
    }
  };

  const handleRegenerateClick = async () => {
    if (!element.query?.trim()) return;

    setLocalError(null);
    try {
      const result = await generateImageAction(
        element.query,
        imageModel as ImageModelList,
      );
      if (result.success && result.image) {
        // Update the element using the editor or global state
        const { slides, setSlides } = usePresentationState.getState();
        if (isRootImage) {
          setSlides(
            slides.map((slide, index) =>
              index === slideIndex
                ? {
                    ...slide,
                    rootImage: {
                      ...slide.rootImage!,
                      url: result.image.url,
                    },
                  }
                : slide,
            ),
          );
        } else {
          editor.tf.setNodes(
            { url: result.image.url },
            { at: editor.api.findPath(element) },
          );
        }
      } else {
        setLocalError(result.error ?? "Failed to regenerate image");
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to regenerate image",
      );
    }
  };
  return (
    <div className="space-y-4">
      {localError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label>Image Prompt</Label>
        <Textarea
          placeholder="Describe the image you want to generate..."
          className="min-h-[100px]"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          disabled={false}
        />
      </div>

      <ImageSourceSelector
        imageSource={imageSource}
        imageModel={imageModel}
        stockImageProvider={stockImageProvider}
        onImageSourceChange={setImageSource}
        onImageModelChange={setImageModel}
        onStockImageProviderChange={setStockImageProvider}
        className="space-y-2"
        showLabel={true}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="default"
          className="flex-1"
          onClick={handleGenerateClick}
          disabled={false}
        >
          <Wand2 className="mr-2 h-4 w-4" /> Generate
        </Button>

        {element.url && (
          <Button
            variant="outline"
            onClick={handleRegenerateClick}
            disabled={false}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        )}
      </div>
    </div>
  );
}
