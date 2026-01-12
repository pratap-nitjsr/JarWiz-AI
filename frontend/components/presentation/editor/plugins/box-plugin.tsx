import { type TElement } from "platejs";
import { createTPlatePlugin } from "platejs/react";
import BoxGroup from "../custom-elements/box";
import { BoxItem } from "../custom-elements/box-item";
import { BOX_GROUP, BOX_ITEM } from "../lib";

export const BoxGroupPlugin = createTPlatePlugin({
  key: BOX_GROUP,
  node: {
    isElement: true,
    type: BOX_GROUP,
    component: BoxGroup,
  },
});

export const BoxItemPlugin = createTPlatePlugin({
  key: BOX_ITEM,
  node: {
    isElement: true,
    type: BOX_ITEM,
    component: BoxItem,
  },
});

export type TBoxGroupElement = TElement & { type: typeof BOX_GROUP };
export type TBoxItemElement = TElement & { type: typeof BOX_ITEM };
