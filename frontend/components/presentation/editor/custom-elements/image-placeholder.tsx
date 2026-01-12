"use client";

import type React from "react";

import { useUploadFile } from "@/components/plate/hooks/use-upload-file";
import { ImageSourceSelector } from "@/components/presentation/theme/ImageSourceSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export interface ImagePlaceholderProps {
  onGenerate?: (prompt: string) => void;
  isStatic?: boolean;
  className?: string;
  slideIndex?: number;
}

export default function ImagePlaceholder({
  isStatic = false,
  className,
  onGenerate,
  slideIndex,
}: ImagePlaceholderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const setSlides = usePresentationState((s) => s.setSlides);
  const slides = usePresentationState((s) => s.slides);

  // Image source state
  const {
    imageSource,
    setImageSource,
    imageModel,
    setImageModel,
    stockImageProvider,
    setStockImageProvider,
  } = usePresentationState();

  const { uploadFile, isUploading, progress } = useUploadFile({
    onUploadComplete: (file) => {
      if (slideIndex !== undefined) {
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
      }
    },
    onUploadError: (error) => {
      toast.error("Failed to upload image");
      console.error(error);
    },
  });

  const handleUploadClick = () => {
    if (!isStatic && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !isStatic) {
      void uploadFile(file);
    }
  };

  const handleGenerateClick = () => {
    if (!isStatic && onGenerate && prompt.trim()) {
      onGenerate(prompt);
      setPrompt("");
      setIsPopoverOpen(false);
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-lg overflow-hidden border border-border bg-gradient-to-br from-muted/50 to-muted",
        className,
      )}
    >
      {/* Main placeholder area */}
      <div className="relative h-full flex flex-col items-center justify-center p-8 gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
            <div className="relative w-20 h-20 rounded-2xl bg-background border-2 border-border flex items-center justify-center shadow-sm">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">No image yet</p>
            <p className="text-xs text-muted-foreground">
              Upload or generate an image
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="default"
            className="h-10 px-6 font-medium shadow-sm hover:shadow transition-shadow bg-transparent"
            onClick={handleUploadClick}
            disabled={isStatic || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>

          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="default"
                size="default"
                className="h-10 px-6 font-medium shadow-sm hover:shadow-md transition-shadow"
                disabled={isStatic}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" side="bottom" align="center">
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        Generate Image
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Describe what you want to create
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Image Source Selection */}
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

                  <div className="space-y-2">
                    <Label htmlFor="prompt" className="text-sm font-medium">
                      Image description
                    </Label>
                    <Input
                      id="prompt"
                      type="text"
                      placeholder="A serene mountain landscape at sunset..."
                      className="h-10"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isStatic}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isStatic) {
                          handleGenerateClick();
                        }
                      }}
                    />
                  </div>

                  <Button
                    size="default"
                    className="w-full h-10 font-medium"
                    onClick={handleGenerateClick}
                    disabled={isStatic || !prompt.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Image
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
