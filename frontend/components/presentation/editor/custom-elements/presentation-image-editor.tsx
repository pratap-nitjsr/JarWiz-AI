import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { Save, X } from "lucide-react";
import { type TElement } from "platejs";
import { useEditorRef } from "platejs/react";
import { useEffect, useState } from "react";
import { type RootImage as RootImageType } from "../../utils/parser";
import { type ImageCropSettings } from "../../utils/types";
import {
  ActionButtons,
  ErrorDisplay,
  GenerateControls,
  ImagePreview,
} from "./image-editor";
export interface PresentationImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: TElement & RootImageType;
  layoutType: string;
  slideIndex: number;
  isRootImage?: boolean;
}

export type EditorMode = "generate" | "crop";
export const PresentationImageEditor = ({
  open,
  onOpenChange,
  element,
  layoutType,
  slideIndex,
  isRootImage = false,
}: PresentationImageEditorProps) => {
  const editor = useEditorRef();
  const [currentMode, setCurrentMode] = useState<EditorMode>("generate");
  const setSlides = usePresentationState((s) => s.setSlides);
  const slides = usePresentationState((s) => s.slides);

  useEffect(() => {
    console.log("Element on mount", element);
  }, []);

  // Local crop settings state - only saved when user clicks save
  const [localCropSettings, setLocalCropSettings] = useState<ImageCropSettings>(
    {
      objectFit: element.cropSettings?.objectFit ?? "cover",
      objectPosition: {
        x: element.cropSettings?.objectPosition.x ?? 50,
        y: element.cropSettings?.objectPosition.y ?? 50,
      },
      zoom: element.cropSettings?.zoom ?? 1,
    },
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSaveChanges = () => {
    if (isRootImage) {
      setSlides(
        slides.map((slide, index) =>
          index === slideIndex
            ? {
                ...slide,
                rootImage: {
                  ...slide.rootImage!,
                  cropSettings: localCropSettings,
                },
              }
            : slide,
        ),
      );
    } else {
      editor.tf.setNodes({
        ...element,
        cropSettings: localCropSettings,
      });
    }
    setCurrentMode("generate");
    onOpenChange(false);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setLocalCropSettings({
      objectFit: element.cropSettings?.objectFit ?? "cover",
      objectPosition: {
        x: element.cropSettings?.objectPosition.x ?? 0,
        y: element.cropSettings?.objectPosition.y ?? 0,
      },
      zoom: element.cropSettings?.zoom ?? 1,
    });
    setCurrentMode("generate");
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        console.log("opened editor for ", element);
        onOpenChange(open);
      }}
    >
      <SheetContent className="flex w-full max-w-full flex-col overflow-y-auto md:max-w-3xl xl:max-w-5xl">
        <SheetHeader className="sticky top-0 z-10 space-y-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between py-2">
            <SheetTitle>Image Generator & Editor</SheetTitle>
            {hasUnsavedChanges && (
              <Badge
                variant="outline"
                className="animate-pulse border-orange-500 text-orange-500"
              >
                Unsaved Changes
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-6">
          {/* Error messages */}
          <ErrorDisplay error={undefined} localError={null} />

          {/* Main Preview Area with Action Buttons */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>
                    Generate, upload, or adjust your image.
                  </CardDescription>
                </div>
                <ActionButtons
                  currentMode={currentMode}
                  imageUrl={element.url}
                  onModeChange={setCurrentMode}
                  slideIndex={slideIndex}
                  isRootImage={isRootImage}
                  element={element}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Preview Area with Controls */}
              <ImagePreview
                element={element}
                currentMode={currentMode}
                localCropSettings={localCropSettings}
                slideIndex={slideIndex}
                isRootImage={isRootImage}
                layoutType={layoutType}
                onCropSettingsChange={setLocalCropSettings}
                onUnsavedChanges={setHasUnsavedChanges}
              />

              {/* Generate Mode Controls */}
              {currentMode === "generate" && (
                <GenerateControls
                  element={element}
                  slideIndex={slideIndex}
                  isRootImage={isRootImage}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges}
            className={cn(
              "gap-2 transition-all",
              hasUnsavedChanges && "border-red shadow-lg shadow-primary/25",
            )}
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
