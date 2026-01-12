"use client";

import { useUploadFile } from "@/components/plate/hooks/use-upload-file";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Crop, Loader2, Upload } from "lucide-react";
import { type TElement } from "platejs";
import { useEditorRef } from "platejs/react";
import { useRef } from "react";
import { toast } from "sonner";
import { type RootImage as RootImageType } from "../../../utils/parser";
import { type EditorMode } from "../presentation-image-editor";

interface ActionButtonsProps {
  currentMode: EditorMode;
  imageUrl?: string;
  onModeChange: (mode: EditorMode) => void;
  slideIndex: number;
  isRootImage: boolean;
  element: TElement & RootImageType;
}

export function ActionButtons({
  currentMode,
  element,
  onModeChange,
  slideIndex,
  isRootImage,
}: ActionButtonsProps) {
  const editor = useEditorRef();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading, progress } = useUploadFile({
    onUploadComplete: (file) => {
      const { slides, setSlides } = usePresentationState.getState();
      if (isRootImage) {
        setSlides(
          slides.map((slide, index) =>
            index === slideIndex
              ? {
                  ...slide,
                  rootImage: { ...slide.rootImage!, url: file.ufsUrl },
                }
              : slide,
          ),
        );
      } else {
        editor.tf.setNodes(
          { url: file.ufsUrl },
          { at: editor.api.findPath(element) },
        );
      }
    },
    onUploadError: (error) => {
      toast.error("Failed to upload image");
      console.error(error);
    },
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };
  return (
    <div className="flex gap-2">
      {/* Upload Button - Direct Action */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleUploadClick}
        className="gap-2"
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isUploading ? `${progress}%` : "Upload"}
      </Button>

      {/* Crop Button - Mode Toggle */}
      <Button
        variant={currentMode === "crop" ? "default" : "outline"}
        size="sm"
        onClick={() => {
          if (currentMode === "crop") {
            onModeChange("generate");
          } else {
            onModeChange("crop");
          }
        }}
        disabled={!element.url}
        className="gap-2"
      >
        <Crop className="h-4 w-4" />
        Crop
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
