"use client";

import { BulletGroupPlugin, BulletItemPlugin } from "./plugins/bullet-plugin";
import { CycleItemPlugin, CyclePlugin } from "./plugins/cycle-plugin";
import { GeneratingPlugin } from "./plugins/generating-plugin";
import { IconListItemPlugin, IconListPlugin } from "./plugins/icon-list-plugin";
import { IconPlugin } from "./plugins/icon-plugin";
import {
  StaircaseGroupPlugin,
  StairItemPlugin,
} from "./plugins/staircase-plugin";
// Create presentation-specific plugins

import { AIKit } from "@/components/plate/plugins/ai-kit";
import { AlignKit } from "@/components/plate/plugins/align-kit";
import { AutoformatKit } from "@/components/plate/plugins/autoformat-kit";
import { BasicMarksKit } from "@/components/plate/plugins/basic-marks-kit";
import { BlockMenuKit } from "@/components/plate/plugins/block-menu-kit";
import { BlockPlaceholderKit } from "@/components/plate/plugins/block-placeholder-kit";
import { CalloutKit } from "@/components/plate/plugins/callout-kit";
import { CodeBlockKit } from "@/components/plate/plugins/code-block-kit";
import { ColumnKit } from "@/components/plate/plugins/column-kit";
import { CommentKit } from "@/components/plate/plugins/comment-kit";
import { CursorOverlayKit } from "@/components/plate/plugins/cursor-overlay-kit";
import { DateKit } from "@/components/plate/plugins/date-kit";
import { DiscussionKit } from "@/components/plate/plugins/discussion-kit";
import { DndKit } from "@/components/plate/plugins/dnd-kit";
import { ExitBreakKit } from "@/components/plate/plugins/exit-break-kit";
import { FixedToolbarKit } from "@/components/plate/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/plate/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/plate/plugins/font-kit";
import { LineHeightKit } from "@/components/plate/plugins/line-height-kit";
import { LinkKit } from "@/components/plate/plugins/link-kit";
import { ListKit } from "@/components/plate/plugins/list-kit";
import { MarkdownKit } from "@/components/plate/plugins/markdown-kit";
import { MathKit } from "@/components/plate/plugins/math-kit";
import { MentionKit } from "@/components/plate/plugins/mention-kit";
import { SlashKit } from "@/components/plate/plugins/slash-kit";
import { SuggestionKit } from "@/components/plate/plugins/suggestion-kit";
// import { TableKit } from "@/components/plate/plugins/table-kit";
import { TocKit } from "@/components/plate/plugins/toc-kit";
import { ToggleKit } from "@/components/plate/plugins/toggle-kit";
import { ArrowListItemPlugin, ArrowListPlugin } from "./plugins/arrow-plugin";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import {
  BeforeAfterGroupPlugin,
  BeforeAfterSidePlugin,
} from "./plugins/before-after-plugin";
import { BoxGroupPlugin, BoxItemPlugin } from "./plugins/box-plugin";
import { ButtonPlugin } from "./plugins/button-plugin";
import {
  AreaChartPlugin,
  BarChartPlugin,
  LineChartPlugin,
  PieChartPlugin,
  RadarChartPlugin,
  ScatterChartPlugin,
} from "./plugins/chart-plugin";
import {
  CompareGroupPlugin,
  CompareSidePlugin,
} from "./plugins/compare-plugin";
import {
  VisualizationItemPlugin,
  VisualizationListPlugin,
} from "./plugins/legacy/visualization-list-plugin";
import { MediaKit } from "./plugins/media-kit";
import { PresentationTableKit } from "./plugins/presentation-table-kit";
import {
  ConsItemPlugin,
  ProsConsGroupPlugin,
  ProsItemPlugin,
} from "./plugins/pros-cons-plugin";
import {
  PyramidGroupPlugin,
  PyramidItemPlugin,
} from "./plugins/pyramid-plugin";
import {
  SequenceArrowGroupPlugin,
  SequenceArrowItemPlugin,
} from "./plugins/sequence-arrow-plugin";
import { TimelineItemPlugin, TimelinePlugin } from "./plugins/timeline-plugin";
// import { TablePlugin, TableRowPlugin, TableCellPlugin } from "./plugins/table-plugin";

export const presentationPlugins = [
  ...AIKit,

  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  // Replace default table with themed presentation table
  ...PresentationTableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...ExitBreakKit,

  // Parsers
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
  // TrailingBlockPlugin,

  // Custom ELements
  VisualizationListPlugin,
  VisualizationItemPlugin,

  BulletGroupPlugin,
  BulletItemPlugin,

  StaircaseGroupPlugin,
  StairItemPlugin,

  IconPlugin,
  IconListPlugin,
  IconListItemPlugin,

  ArrowListPlugin,
  ArrowListItemPlugin,

  TimelinePlugin,
  TimelineItemPlugin,

  PyramidGroupPlugin,
  PyramidItemPlugin,

  // New components
  BoxGroupPlugin,
  BoxItemPlugin,

  CompareGroupPlugin,
  CompareSidePlugin,

  BeforeAfterGroupPlugin,
  BeforeAfterSidePlugin,

  ProsConsGroupPlugin,
  ProsItemPlugin,
  ConsItemPlugin,

  SequenceArrowGroupPlugin,
  SequenceArrowItemPlugin,

  // Individual chart elements
  PieChartPlugin,
  BarChartPlugin,
  AreaChartPlugin,
  RadarChartPlugin,
  ScatterChartPlugin,
  LineChartPlugin,

  CycleItemPlugin,
  CyclePlugin,

  GeneratingPlugin,
  ButtonPlugin,
];
