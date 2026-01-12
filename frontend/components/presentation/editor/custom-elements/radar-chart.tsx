"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import { type TChartNode } from "../plugins/chart-plugin";

type AnyRecord = Record<string, unknown>;

function getLabelKey(data: unknown[]): string {
  if (data.length === 0) return "label";
  const sample = data[0] as AnyRecord;
  if ("label" in sample) return "label";
  if ("name" in sample) return "name";
  return "label";
}

function getValueKey(data: unknown[]): string {
  if (data.length === 0) return "value";
  const sample = data[0] as AnyRecord;
  if ("value" in sample) return "value";
  if ("y" in sample) return "y";
  return "value";
}

export default function RadarChartElement(
  props: PlateElementProps<TChartNode>,
) {
  const rawData = (props.element as TChartNode).data as unknown;
  const dataArray = Array.isArray(rawData) ? (rawData as AnyRecord[]) : [];
  const labelKey = getLabelKey(dataArray);
  const valueKey = getValueKey(dataArray);

  const chartConfig: ChartConfig = {
    [valueKey]: {
      label: "Value",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "relative mb-4 w-full rounded-lg border bg-card p-2 shadow-sm",
        )}
        style={{
          backgroundColor: "var(--presentation-background)",
          color: "var(--presentation-text)",
          borderColor: "hsl(var(--border))",
        }}
        contentEditable={false}
      >
        <ChartContainer className="h-64 w-full" config={chartConfig}>
          <RadarChart data={dataArray} outerRadius={90}>
            <PolarGrid />
            <PolarAngleAxis dataKey={labelKey} />
            <PolarRadiusAxis />
            <Radar
              dataKey={valueKey}
              stroke={`var(--color-${valueKey})`}
              fill={`var(--color-${valueKey})`}
              fillOpacity={0.2}
            />
            <Legend />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
        {/* non-editable */}
      </div>
    </PlateElement>
  );
}
