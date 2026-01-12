"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { Cell, Legend, Pie, PieChart } from "recharts";

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
  if ("count" in sample) return "count";
  return "value";
}

export default function PieChartStatic(props: PlateElementProps) {
  const rawData = (props.element as unknown as { data?: unknown }).data;
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
      >
        <ChartContainer className="h-[19rem] w-full" config={chartConfig}>
          <PieChart>
            <Pie
              data={dataArray}
              dataKey={valueKey}
              nameKey={labelKey}
              outerRadius={110}
              isAnimationActive={true}
              labelLine={false}
              label={({ percent }) =>
                percent !== undefined
                  ? `${Math.round((percent as number) * 100)}%`
                  : ""
              }
            >
              {dataArray.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                />
              ))}
            </Pie>
            <Legend />
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </div>
    </PlateElement>
  );
}
