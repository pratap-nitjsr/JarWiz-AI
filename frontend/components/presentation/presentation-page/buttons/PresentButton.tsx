"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { Play, X } from "lucide-react";

export function PresentButton() {
  const isPresenting = usePresentationState((s) => s.isPresenting);
  const setIsPresenting = usePresentationState((s) => s.setIsPresenting);
  const isGeneratingPresentation = usePresentationState(
    (s) => s.isGeneratingPresentation,
  );
  const isGeneratingOutline = usePresentationState(
    (s) => s.isGeneratingOutline,
  );

  // Check if generation is in progress
  const isGenerating = isGeneratingPresentation || isGeneratingOutline;

  return (
    <Button
      size="sm"
      className={cn(
        isPresenting
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-purple-600 text-white hover:bg-purple-700",
        isGenerating && "cursor-not-allowed opacity-70",
      )}
      onClick={() => !isGenerating && setIsPresenting(!isPresenting)}
      disabled={isGenerating}
    >
      {isPresenting ? (
        <>
          <X className="mr-1 h-4 w-4" />
          Exit
        </>
      ) : (
        <>
          <Play className="mr-1 h-4 w-4" />
          Present
        </>
      )}
    </Button>
  );
}
