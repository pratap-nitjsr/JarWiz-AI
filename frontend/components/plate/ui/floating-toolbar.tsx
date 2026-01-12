"use client";

import * as React from "react";

import { type FloatingToolbarState, flip, offset } from "@platejs/floating";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { KEYS } from "platejs";
import {
  useComposedRef,
  useEditorId,
  useEditorRef,
  useEventEditorValue,
  usePluginOption,
} from "platejs/react";

import { cn } from "@/lib/utils";

import { BLOCKS } from "@/components/presentation/editor/lib";
import { type MyEditor } from "../editor-kit";
import {
  useFloatingToolbar,
  useFloatingToolbarState,
} from "../hooks/use-floating-toolbar";
import { Toolbar } from "./toolbar";

export function FloatingToolbar({
  children,
  className,
  state,
  ...props
}: React.ComponentProps<typeof Toolbar> & {
  state?: FloatingToolbarState;
}) {
  const editorId = useEditorId();
  const editor = useEditorRef<MyEditor>();
  const focusedEditorId = useEventEditorValue("focus");
  const isFloatingLinkOpen = !!usePluginOption({ key: KEYS.link }, "mode");
  const isAIChatOpen = usePluginOption({ key: KEYS.aiChat }, "open");

  // Check if any blocks are selected
  const selectedIds = usePluginOption(BlockSelectionPlugin, "selectedIds");
  const hasBlockSelection = selectedIds && selectedIds.size > 0;

  // Check if the selected blocks are layout blocks
  const isLayoutBlockSelected = React.useMemo(() => {
    if (!hasBlockSelection || !selectedIds) return false;

    // Check if any of the selected blocks are layout blocks
    for (const blockId of selectedIds) {
      const block = editor.api.node({ id: blockId, at: [] });
      if (block?.[0]) {
        const blockType = block[0].type as string;
        if (BLOCKS.some((block) => block.type === blockType)) {
          return true;
        }
      }
    }

    return false;
  }, [hasBlockSelection, selectedIds, editor]);

  const floatingToolbarState = useFloatingToolbarState({
    editorId,
    focusedEditorId,
    hideToolbar: isLayoutBlockSelected || isFloatingLinkOpen || isAIChatOpen,
    // Override the default behavior to show toolbar when blocks are selected
    enableBlockSelection: true,
    ...state,
    floatingOptions: {
      middleware: [
        offset(12),
        flip({
          fallbackPlacements: [
            "top-start",
            "top-end",
            "bottom-start",
            "bottom-end",
          ],
          padding: 12,
        }),
      ],
      placement: "top",
      ...state?.floatingOptions,
    },
  });

  const {
    clickOutsideRef,
    hidden,
    props: rootProps,
    ref: floatingRef,
  } = useFloatingToolbar(floatingToolbarState);

  const ref = useComposedRef<HTMLDivElement>(props.ref, floatingRef);

  // Show toolbar if blocks are selected, even if normally hidden
  if (hidden && !hasBlockSelection) return null;

  return (
    <div ref={clickOutsideRef}>
      <Toolbar
        {...props}
        {...rootProps}
        ref={ref}
        className={cn(
          "absolute z-50 overflow-x-auto whitespace-nowrap rounded-md border bg-popover p-1 opacity-100 shadow-md scrollbar-hide print:hidden",
          "max-w-[80vw]",
          className,
        )}
      >
        {children}
      </Toolbar>
    </div>
  );
}
