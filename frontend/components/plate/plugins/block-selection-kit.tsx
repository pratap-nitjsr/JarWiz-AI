/** biome-ignore-all lint/suspicious/noExplicitAny: This use requires any */
"use client";

import { BlockSelectionPlugin } from "@platejs/selection/react";
import { getPluginTypes, KEYS, type TElement } from "platejs";

import { BlockSelection } from "@/components/plate/ui/block-selection";

export const BlockSelectionKit = [
  BlockSelectionPlugin.configure(({ editor }) => ({
    options: {
      enableContextMenu: true,
      isSelectable: (element) => {
        return !getPluginTypes(editor, [
          KEYS.column,
          KEYS.codeLine,
          KEYS.table,
          KEYS.td,
        ]).includes(element.type);
      },
    },
    render: {
      belowRootNodes: (props) => {
        if (!props.attributes.className?.includes("slate-selectable"))
          return null;

        return <BlockSelection {...(props as any)} />;
      },
    },
  })).extendEditorTransforms(({ editor, api }) => ({
    selectAll: () => {
      const selectedIds = editor.getOption(BlockSelectionPlugin, "selectedIds");

      if (selectedIds?.size === 0) {
        // First press: select current block
        const currentBlock = editor.api.block({ at: editor.selection?.focus });
        if (currentBlock) {
          const [block] = currentBlock;
          if (block.id) {
            api.blockSelection.set([block.id as string]);
            return true; // Indicate we handled it
          }
        }
      }

      // Second press or fallback: select all blocks
      const ids = editor.api
        .blocks({
          at: [],
          mode: "highest",
          match: (n, p) =>
            !!n.id && api.blockSelection.isSelectable(n[0] as TElement, p),
        })
        .map((n) => n[0].id);

      editor.setOption(
        BlockSelectionPlugin,
        "selectedIds",
        new Set(ids as string[]),
      );
      api.blockSelection.focus();

      return true;
    },
  })),
];
