import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePresentationState } from "@/states/presentation-state";
import { Globe } from "lucide-react";

export function WebSearchToggle() {
  const { webSearchEnabled, setWebSearchEnabled, isGeneratingOutline } =
    usePresentationState();

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full bg-background/95 backdrop-blur-sm px-3.5 py-2 shadow-sm border border-border transition-all hover:shadow-md">
      <div className="flex items-center gap-2">
        <Globe
          className={`h-3.5 w-3.5 transition-colors ${webSearchEnabled ? "text-primary" : "text-muted-foreground"}`}
        />
        <Label
          htmlFor="web-search-toggle"
          className="text-xs font-medium leading-none cursor-pointer select-none text-foreground"
        >
          Web Search
        </Label>
      </div>
      <Switch
        id="web-search-toggle"
        checked={webSearchEnabled}
        onCheckedChange={setWebSearchEnabled}
        disabled={isGeneratingOutline}
      />
    </div>
  );
}
