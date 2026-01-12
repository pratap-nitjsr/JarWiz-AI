"use client";

import { type MyEditor } from "@/components/plate/editor-kit";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { type TElement } from "@platejs/slate";
import { KEYS } from "platejs";
import { type PlateEditor } from "platejs/react";
import { getCycleItemGridClass } from "./custom-elements/cycle-item";

export const BULLET_ITEM = "bullet";
export const BULLET_GROUP = "bullets";
export const STAIR_ITEM = "stair-item";
export const STAIRCASE_GROUP = "staircase";
export const CYCLE_ITEM = "cycle-item";
export const CYCLE_GROUP = "cycle";
export const ICON_ELEMENT = "icon";
export const ICON_LIST_ITEM = "icon-item";
export const ICON_LIST = "icons";
export const ARROW_LIST = "arrows";
export const ARROW_LIST_ITEM = "arrow-item";
export const PYRAMID_GROUP = "pyramid";
export const PYRAMID_ITEM = "pyramid-item";
export const TIMELINE_GROUP = "timeline";
export const TIMELINE_ITEM = "timeline-item";

// New components
export const BOX_GROUP = "boxes";
export const BOX_ITEM = "box-item";

export const COMPARE_GROUP = "compare";
export const COMPARE_SIDE = "compare-side";

export const BEFORE_AFTER_GROUP = "before-after";
export const BEFORE_AFTER_SIDE = "before-after-side";

export const PROS_CONS_GROUP = "pros-cons";
export const PROS_ITEM = "pros-item";
export const CONS_ITEM = "cons-item";

export const SEQUENCE_ARROW_GROUP = "arrow-vertical";
export const SEQUENCE_ARROW_ITEM = "arrow-vertical-item";

// Individual chart element keys
export const PIE_CHART_ELEMENT = "chart-pie" as const;
export const BAR_CHART_ELEMENT = "chart-bar" as const;
export const AREA_CHART_ELEMENT = "chart-area" as const;
export const RADAR_CHART_ELEMENT = "chart-radar" as const;
export const SCATTER_CHART_ELEMENT = "chart-scatter" as const;
export const LINE_CHART_ELEMENT = "chart-line" as const;
// Button element key
export const BUTTON_ELEMENT = "button" as const;

// Chart compatibility groups based on data structure
export const CHART_TYPES = {
  // Charts using label/value data structure (compatible with each other)
  LABEL_VALUE_CHARTS: [
    PIE_CHART_ELEMENT,
    BAR_CHART_ELEMENT,
    AREA_CHART_ELEMENT,
    RADAR_CHART_ELEMENT,
    LINE_CHART_ELEMENT,
  ],
  // Charts using coordinate data structure (x/y)
  COORDINATE_CHARTS: [SCATTER_CHART_ELEMENT],
} as const;

// Helper function to check if two chart types are compatible
export function areChartTypesCompatible(
  chartType1: string,
  chartType2: string,
): boolean {
  // Charts are compatible if they use the same data structure
  const isLabelValue1 = CHART_TYPES.LABEL_VALUE_CHARTS.includes(
    chartType1 as (typeof CHART_TYPES.LABEL_VALUE_CHARTS)[number],
  );
  const isLabelValue2 = CHART_TYPES.LABEL_VALUE_CHARTS.includes(
    chartType2 as (typeof CHART_TYPES.LABEL_VALUE_CHARTS)[number],
  );
  const isCoordinate1 = CHART_TYPES.COORDINATE_CHARTS.includes(
    chartType1 as (typeof CHART_TYPES.COORDINATE_CHARTS)[number],
  );
  const isCoordinate2 = CHART_TYPES.COORDINATE_CHARTS.includes(
    chartType2 as (typeof CHART_TYPES.COORDINATE_CHARTS)[number],
  );

  return (isLabelValue1 && isLabelValue2) || (isCoordinate1 && isCoordinate2);
}

// Helper function to check if an element type is a chart
export function isChartType(elementType: string): boolean {
  return [
    ...CHART_TYPES.LABEL_VALUE_CHARTS,
    ...CHART_TYPES.COORDINATE_CHARTS,
  ].includes(
    elementType as
      | (typeof CHART_TYPES.LABEL_VALUE_CHARTS)[number]
      | (typeof CHART_TYPES.COORDINATE_CHARTS)[number],
  );
}

// Element capabilities - defines which elements support which layout options
export const ELEMENT_CAPABILITIES = {
  [TIMELINE_GROUP]: {
    orientation: ["vertical", "horizontal"] as const,
    sidedness: ["single", "double"] as const,
    numbered: true,
    showLine: true,
  },
  // Add more elements here as they gain orientation/sidedness support
  // [ARROW_LIST]: {
  //   orientation: ["vertical", "horizontal"] as const,
  // },
  // [COMPARE_GROUP]: {
  //   sidedness: ["single", "double"] as const,
  // },
} as const;

// Helper functions to check element capabilities
export function supportsOrientation(elementType: string): boolean {
  return (
    elementType in ELEMENT_CAPABILITIES &&
    "orientation" in
      ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES]
  );
}

export function supportsSidedness(elementType: string): boolean {
  return (
    elementType in ELEMENT_CAPABILITIES &&
    "sidedness" in
      ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES]
  );
}

export function supportsNumbered(elementType: string): boolean {
  return (
    elementType in ELEMENT_CAPABILITIES &&
    "numbered" in
      ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES]
  );
}

export function supportsShowLine(elementType: string): boolean {
  return (
    elementType in ELEMENT_CAPABILITIES &&
    "showLine" in
      ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES]
  );
}

export function getOrientationOptions(elementType: string): readonly string[] {
  const capabilities =
    ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES];
  return capabilities?.orientation ?? [];
}

export function getSidednessOptions(elementType: string): readonly string[] {
  const capabilities =
    ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES];
  return capabilities?.sidedness ?? [];
}

export function getNumberedOptions(elementType: string): boolean {
  const capabilities =
    ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES];
  return capabilities?.numbered ?? false;
}

export function getShowLineOptions(elementType: string): boolean {
  const capabilities =
    ELEMENT_CAPABILITIES[elementType as keyof typeof ELEMENT_CAPABILITIES];
  return capabilities?.showLine ?? false;
}

// Available layout blocks with their display names
export const BLOCKS = [
  // Layout Groups
  { type: BULLET_GROUP, name: "Bullet" },
  { type: STAIRCASE_GROUP, name: "Staircase" },
  { type: CYCLE_GROUP, name: "Cycle" },
  { type: ICON_LIST, name: "Icons" },
  { type: ARROW_LIST, name: "Arrows" },
  { type: PYRAMID_GROUP, name: "Pyramid" },
  { type: TIMELINE_GROUP, name: "Timeline" },
  { type: BOX_GROUP, name: "Box" },
  { type: COMPARE_GROUP, name: "Compare" },
  { type: BEFORE_AFTER_GROUP, name: "Before After" },
  { type: PROS_CONS_GROUP, name: "Pros Cons" },
  { type: SEQUENCE_ARROW_GROUP, name: "Arrow Sequence" },

  // Chart Elements
  { type: PIE_CHART_ELEMENT, name: "Pie Chart" },
  { type: BAR_CHART_ELEMENT, name: "Bar Chart" },
  { type: AREA_CHART_ELEMENT, name: "Area Chart" },
  { type: RADAR_CHART_ELEMENT, name: "Radar Chart" },
  { type: SCATTER_CHART_ELEMENT, name: "Scatter Chart" },
  { type: LINE_CHART_ELEMENT, name: "Line Chart" },

  // Other Elements
  { type: BUTTON_ELEMENT, name: "Button" },
] as const;

export const PARENT_CHILD_RELATIONSHIP = {
  [BULLET_GROUP]: {
    child: BULLET_ITEM,
  },
  [STAIRCASE_GROUP]: {
    child: STAIR_ITEM,
  },
  [CYCLE_GROUP]: {
    child: CYCLE_ITEM,
  },
  [ICON_LIST]: {
    child: ICON_LIST_ITEM,
  },
  [ARROW_LIST]: {
    child: ARROW_LIST_ITEM,
  },
  [PYRAMID_GROUP]: {
    child: PYRAMID_ITEM,
  },
  [TIMELINE_GROUP]: {
    child: TIMELINE_ITEM,
  },
  [BOX_GROUP]: {
    child: BOX_ITEM,
  },
  [COMPARE_GROUP]: {
    child: COMPARE_SIDE,
  },
  [BEFORE_AFTER_GROUP]: {
    child: BEFORE_AFTER_SIDE,
  },
  [PROS_CONS_GROUP]: {
    child: [PROS_ITEM, CONS_ITEM],
  },
  [SEQUENCE_ARROW_GROUP]: {
    child: SEQUENCE_ARROW_ITEM,
  },
};
// Single helper per latest instruction: given only editor and element, derive class.
export function getGridClassForElement(
  editor: PlateEditor,
  element: TElement,
): string {
  const path = editor.api.findPath(element) ?? [];

  if (element.type === CYCLE_ITEM)
    return getCycleItemGridClass(editor, element, path);

  if (element.type === PROS_ITEM || element.type === CONS_ITEM) return "h-full";

  if (element.type === KEYS.column) return "flex-1";
  return "";
}

/**
 * Gets available conversion options based on the current element type
 * @param currentElementType - The type of the currently selected element
 * @returns Array of available block types for conversion
 */
export function getAvailableConversionOptions(currentElementType: string) {
  const isCurrentElementChart = isChartType(currentElementType);

  return BLOCKS.filter((blockType) => {
    const isBlockTypeChart = isChartType(blockType.type);

    // If current element is not a chart, show all non-chart elements
    if (!isCurrentElementChart) {
      return !isBlockTypeChart;
    }

    // If current element is a chart, only show compatible chart types
    if (isCurrentElementChart) {
      return (
        isBlockTypeChart &&
        areChartTypesCompatible(currentElementType, blockType.type)
      );
    }

    return false;
  });
}
/**
 * Handles the conversion of layout elements to different types
 * @param editor - The Plate editor instance
 * @param type - The target element type to convert to
 */
export function handleLayoutChange(editor: MyEditor, type: string): void {
  const selectionIds = editor.getOption(BlockSelectionPlugin, "selectedIds");
  const node = editor.api.nodes({ id: Array.from(selectionIds ?? [])[0] });
  const [element] = node?.[0] ?? [];

  if (!element) return;

  // Handle parent-child relationship elements (lists, groups, etc.)
  if (PARENT_CHILD_RELATIONSHIP[element.type]?.child) {
    editor.tf.withoutNormalizing(() => {
      editor.tf.setNodes({ type }, { at: editor.api.findPath(element) });
      element.children.forEach((child) => {
        editor.tf.setNodes(
          { type: PARENT_CHILD_RELATIONSHIP[type]?.child },
          { at: editor.api.findPath(child) },
        );
      });
    });
    return;
  }

  // Handle chart elements (direct conversion)
  if (isChartType(element.type)) {
    editor.tf.setNodes({ type }, { at: editor.api.findPath(element) });
  }
}

/**
 * Handles updating node properties with forced sibling updates
 * @param editor - The Plate editor instance
 * @param key - The property key to update
 * @param value - The new value for the property
 */
export function handleNodePropertyUpdate(
  editor: MyEditor,
  key: string,
  value: string | boolean | undefined,
): void {
  const selectionIds = editor.getOption(BlockSelectionPlugin, "selectedIds");
  const node = editor.api.nodes({ id: Array.from(selectionIds ?? [])[0] });
  const [element] = node?.[0] ?? [];

  if (!element) return;

  const elementPath = editor.api.findPath(element);
  if (!elementPath) return;

  editor.tf.withoutNormalizing(() => {
    if (value === undefined) {
      // Remove the property by setting it to undefined
      editor.tf.setNodes({ [key]: undefined }, { at: elementPath });
    } else {
      // Update the node property - convert boolean to string for numbered property
      editor.tf.setNodes({ [key]: value }, { at: elementPath });
    }
    // Force update all the siblings so that the UI is updated
    element.children.forEach((child) => {
      editor.tf.setNodes(
        { lastUpdate: Date.now() },
        { at: editor.api.findPath(child) },
      );
    });
  });
}
