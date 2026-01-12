import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDownIcon, Loader2, SearchIcon } from "lucide-react";

export interface SearchResult {
  url: string;
  title: string;
  published_date: string;
  content: string;
}
// Searching Component
export function Searching({ query }: { query: string }) {
  return (
    <div className="mb-2 w-full rounded-lg border border-primary/20 bg-background">
      <div className="flex h-12 items-center gap-3 px-4 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Searching the web for &quot;{query}&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

// Searched Component
export function Searched({
  results,
  query,
}: {
  results: SearchResult[];
  query: string;
}) {
  return (
    <Collapsible className="mb-2 w-full rounded-lg border border-primary/20 bg-background">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-12 w-full justify-between px-4">
          <div className="flex w-[90%] items-center gap-3">
            <SearchIcon className="h-5 w-5" />
            <div className="flex flex-col items-start overflow-hidden">
              <span className="w-full truncate overflow-ellipsis text-sm font-medium">
                {query}
              </span>
              <span className="text-xs text-muted-foreground">
                {results?.length} results found
              </span>
            </div>
          </div>
          <ChevronsUpDownIcon className="h-5 w-5 transition-transform duration-300 [&[data-state=open]]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 p-4">
        {results.map((result, index) => {
          const domain = new URL(result.url).hostname;
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-primary/20 p-3"
            >
              {/** biome-ignore lint/performance/noImgElement: This is a valid use case */}
              <img src={faviconUrl} alt={domain} className="mt-1 h-4 w-4" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <h4 className="truncate text-sm font-medium">{result.title}</h4>
                <p className="line-clamp-2 overflow-ellipsis text-xs text-muted-foreground">
                  {result.content}
                </p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-primary hover:underline"
                >
                  {result.url}
                </a>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
