import { type TElement } from "platejs";
import { createTPlatePlugin } from "platejs/react";
import AreaChartElement from "../custom-elements/area-chart";
import BarGraphElement from "../custom-elements/bar-graph";
import LineGraphElement from "../custom-elements/line-graph";
import PieChartElement from "../custom-elements/pie-chart";
import RadarChartElement from "../custom-elements/radar-chart";
import ScatterPlotElement from "../custom-elements/scatter-plot";
import AreaChartStatic from "../custom-elements/static/area-chart-static";
import BarGraphStatic from "../custom-elements/static/bar-graph-static";
import LineGraphStatic from "../custom-elements/static/line-graph-static";
import PieChartStatic from "../custom-elements/static/pie-chart-static";
import RadarChartStatic from "../custom-elements/static/radar-chart-static";
import ScatterPlotStatic from "../custom-elements/static/scatter-plot-static";
import {
  AREA_CHART_ELEMENT,
  BAR_CHART_ELEMENT,
  LINE_CHART_ELEMENT,
  PIE_CHART_ELEMENT,
  RADAR_CHART_ELEMENT,
  SCATTER_CHART_ELEMENT,
} from "../lib";

export type TChartNode = TElement & {
  chartType?: "bar" | "line" | "pie" | "scatter" | "histogram";
  data?: unknown;
  options?: Record<string, unknown>;
};

// Individual chart plugins (editable)
export const PieChartPlugin = createTPlatePlugin({
  key: PIE_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: PIE_CHART_ELEMENT,
    component: PieChartElement,
  },
});

export const BarChartPlugin = createTPlatePlugin({
  key: BAR_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: BAR_CHART_ELEMENT,
    component: BarGraphElement,
  },
});

export const AreaChartPlugin = createTPlatePlugin({
  key: AREA_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: AREA_CHART_ELEMENT,
    component: AreaChartElement,
  },
});

export const ScatterChartPlugin = createTPlatePlugin({
  key: SCATTER_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: SCATTER_CHART_ELEMENT,
    component: ScatterPlotElement,
  },
});

export const LineChartPlugin = createTPlatePlugin({
  key: LINE_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: LINE_CHART_ELEMENT,
    component: LineGraphElement,
  },
});

export const RadarChartPlugin = createTPlatePlugin({
  key: RADAR_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: RADAR_CHART_ELEMENT,
    component: RadarChartElement,
  },
});

// Individual chart plugins (static)
export const PieChartStaticPlugin = createTPlatePlugin({
  key: PIE_CHART_ELEMENT,
  node: { isElement: true, component: PieChartStatic },
});

export const BarChartStaticPlugin = createTPlatePlugin({
  key: BAR_CHART_ELEMENT,
  node: { isElement: true, component: BarGraphStatic },
});

export const AreaChartStaticPlugin = createTPlatePlugin({
  key: AREA_CHART_ELEMENT,
  node: { isElement: true, component: AreaChartStatic },
});

export const ScatterChartStaticPlugin = createTPlatePlugin({
  key: SCATTER_CHART_ELEMENT,
  node: { isElement: true, component: ScatterPlotStatic },
});

export const LineChartStaticPlugin = createTPlatePlugin({
  key: LINE_CHART_ELEMENT,
  node: { isElement: true, component: LineGraphStatic },
});

export const RadarChartStaticPlugin = createTPlatePlugin({
  key: RADAR_CHART_ELEMENT,
  node: { isElement: true, component: RadarChartStatic },
});
