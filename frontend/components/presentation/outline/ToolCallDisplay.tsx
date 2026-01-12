import {
  Searched,
  type SearchResult,
} from "@/components/presentation/outline/Search";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePresentationState } from "@/states/presentation-state";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

export function ToolCallDisplay() {
  const { searchResults, isGeneratingOutline, webSearchEnabled } =
    usePresentationState();
  const [isExpanded, setIsExpanded] = useState(false);

  if (
    !webSearchEnabled ||
    (searchResults.length === 0 && !isGeneratingOutline)
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border bg-muted/30 p-3 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                Web Search Results ({searchResults.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isGeneratingOutline && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isExpanded ? "Hide" : "Show"}
              </span>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-2 px-4">
          {searchResults.map((searchItem, index) => {
            // Convert our search results to the format expected by the Searched component
            const formattedResults: SearchResult[] = Array.isArray(
              searchItem.results,
            )
              ? searchItem.results.map((result: unknown) => {
                  const searchResult = result as Record<string, unknown>;
                  return {
                    url: (searchResult.url as string) || "",
                    title: (searchResult.title as string) || "No title",
                    published_date: "", // Not available in our format
                    content: (searchResult.content as string) || "No content",
                  };
                })
              : [];

            return (
              <Searched
                key={index}
                query={searchItem.query}
                results={formattedResults}
              />
            );
          })}

          {isGeneratingOutline && searchResults.length === 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  AI is researching...
                </span>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
