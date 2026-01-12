"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
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

export default function LineGraphElement(props: PlateElementProps<TChartNode>) {
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
          <LineChart data={dataArray}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={labelKey} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Line
              type="monotone"
              dataKey={valueKey}
              stroke={`var(--color-${valueKey})`}
              strokeWidth={2}
              dot={false}
            />
            <Legend />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          </LineChart>
        </ChartContainer>
        {/* non-editable */}
      </div>
    </PlateElement>
  );
}
