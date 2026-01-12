"use client";

import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Sparkles } from "lucide-react";
import { WebSearchToggle } from "./WebSearchToggle";

export function PresentationInput({
  handleGenerate,
}: {
  handleGenerate: () => void;
}) {
  const { presentationInput, setPresentationInput, setShowTemplates } =
    usePresentationState();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          What would you like to present about?
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplates(true)}
          className="gap-2 shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Templates
        </Button>
      </div>

      <div className="relative group">
        <textarea
          value={presentationInput}
          onChange={(e) => setPresentationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Describe your topic or paste your content here. Our AI will structure it into a compelling presentation."
          className="h-40 w-full resize-none rounded-lg border border-border bg-card px-4 py-3.5 pb-14 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />

        <div className="absolute flex justify-between items-center bottom-3 inset-x-3 z-10">
          <p className="text-xs text-muted-foreground">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] border border-border">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] border border-border">
              Enter
            </kbd>{" "}
            to generate
          </p>
          <WebSearchToggle />
        </div>
      </div>
    </div>
  );
}
