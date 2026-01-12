"use client";

import { useEditorState } from "platejs/react";
import { useEffect } from "react";

/**
 * Global undo/redo handler that listens for Ctrl+Z and Ctrl+Y
 * and performs undo/redo on the last modified slide when no editor is focused
 */
export function GlobalUndoRedoHandler() {
  const editor = useEditorState();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl+Z (undo) or Ctrl+Y (redo) is pressed
      const isUndo = event.ctrlKey && event.key === "z" && !event.shiftKey;
      const isRedo =
        (event.ctrlKey && event.key === "y") ||
        (event.ctrlKey && event.shiftKey && event.key === "Z");

      if (!isUndo && !isRedo) return;

      // Check if we're currently focused on an input, textarea, or contenteditable
      const activeElement = document.activeElement;
      const isEditorFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true" ||
          activeElement.closest('[contenteditable="true"]') ||
          // Check if we're focused on a Plate editor
          activeElement.closest("[data-plate-editor]") ||
          activeElement.closest(".presentation-slide"));

      // Only perform global undo/redo if no editor is focused and we have history
      if (!isEditorFocused) {
        event.preventDefault();
        event.stopPropagation();

        if (isUndo) {
          editor.tf.undo();
        } else if (isRedo) {
          editor.tf.redo();
        }
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown, true);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor]);

  // This component doesn't render anything
  return null;
}
