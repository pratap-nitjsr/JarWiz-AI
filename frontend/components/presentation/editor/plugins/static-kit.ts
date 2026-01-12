import { KEYS } from "platejs";
import VisualizationItemElementStatic from "../custom-elements/legacy/visualization-item-static";
import VisualizationListElementStatic from "../custom-elements/legacy/visualization-list-static";
import { ArrowItemStatic } from "../custom-elements/static/arrow-item-static";
import ArrowListStatic from "../custom-elements/static/arrow-list-static";
import { BulletItemStatic } from "../custom-elements/static/bullet-item-static";
import { BulletsElementStatic } from "../custom-elements/static/bullet-static";
import ButtonStatic from "../custom-elements/static/button-static";
import { CycleElementStatic } from "../custom-elements/static/cycle-element-static";
import { CycleItemStatic } from "../custom-elements/static/cycle-item-static";
import { GeneratingLeafStatic } from "../custom-elements/static/generating-leaf-static";
import { IconListItemStatic } from "../custom-elements/static/icon-list-item-static";
import { IconListStatic } from "../custom-elements/static/icon-list-static";
import { IconStatic } from "../custom-elements/static/icon-static";
import { PresentationImageElementStatic } from "../custom-elements/static/presentation-image-element-static";
import { PyramidItemStatic } from "../custom-elements/static/pyramid-item-static";
import PyramidStatic from "../custom-elements/static/pyramid-static";
import { StairItemStatic } from "../custom-elements/static/staircase-item-static";
import StaircaseStatic from "../custom-elements/static/staircase-static";
import { TimelineItemStatic } from "../custom-elements/static/timeline-item-static";
import TimelineStatic from "../custom-elements/static/timeline-static";
import {
  ARROW_LIST,
  ARROW_LIST_ITEM,
  BULLET_GROUP,
  BULLET_ITEM,
  BUTTON_ELEMENT,
  CYCLE_GROUP,
  CYCLE_ITEM,
  ICON_ELEMENT,
  ICON_LIST,
  ICON_LIST_ITEM,
  PYRAMID_GROUP,
  PYRAMID_ITEM,
  STAIRCASE_GROUP,
  STAIR_ITEM,
  TIMELINE_GROUP,
  TIMELINE_ITEM,
} from "../lib";

// Components mapping for static rendering
export const PresentationStaticComponents = {
  [ARROW_LIST]: ArrowListStatic,
  [ARROW_LIST_ITEM]: ArrowItemStatic,
  [BULLET_GROUP]: BulletsElementStatic,
  [BULLET_ITEM]: BulletItemStatic,
  [STAIRCASE_GROUP]: StaircaseStatic,
  [STAIR_ITEM]: StairItemStatic,
  [CYCLE_GROUP]: CycleElementStatic,
  [CYCLE_ITEM]: CycleItemStatic,
  [ICON_ELEMENT]: IconStatic,
  [ICON_LIST]: IconListStatic,
  [ICON_LIST_ITEM]: IconListItemStatic,
  [PYRAMID_GROUP]: PyramidStatic,
  [PYRAMID_ITEM]: PyramidItemStatic,
  [TIMELINE_GROUP]: TimelineStatic,
  [TIMELINE_ITEM]: TimelineItemStatic,
  [BUTTON_ELEMENT]: ButtonStatic,
  // Legacy visualization adapters
  "visualization-list": VisualizationListElementStatic,
  "visualization-item": VisualizationItemElementStatic,
  // Override image key to use presentation image static with crop support
  [KEYS.img]: PresentationImageElementStatic,
  // Marks
  generating: GeneratingLeafStatic,
} as const;
