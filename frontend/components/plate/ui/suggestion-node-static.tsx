import { type TSuggestionText } from "platejs";
import { PlateLeaf, type PlateLeafProps } from "platejs/react";
import { BaseSuggestionPlugin } from "@platejs/suggestion";
import { cn } from "@/lib/utils";

export function SuggestionLeafStatic(props: PlateLeafProps<TSuggestionText>) {
    const { children, leaf } = props;

    const isAddition = (leaf as any)?.suggestionAddition;
    const isDeletion = (leaf as any)?.suggestionDeletion;

    const getSuggestionData = (data: any) => {
        if (!data) return null;
        return data;
    };

    const suggestionData = getSuggestionData((leaf as any)?.suggestion);

    return (
        <PlateLeaf
            {...props}
            className={cn(
                "suggestion-leaf",
                isAddition && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                isDeletion && "bg-red-100 text-red-800 line-through dark:bg-red-900/30 dark:text-red-300"
            )}
        >
            {children}
        </PlateLeaf>
    );
}
