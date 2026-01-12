"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Input } from "./input";

// Data types for different chart types
export type LabelValueData = {
  label: string;
  value: number;
};

export type XYData = {
  x: number;
  y: number;
};

export type ChartDataType = LabelValueData[] | XYData[];

interface ChartDataEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ChartDataType;
  onDataChange: (data: ChartDataType) => void;
  chartType: "label-value" | "xy";
  title?: string;
}

export function ChartDataEditorDialog({
  open,
  onOpenChange,
  data,
  onDataChange,
  chartType,
  title = "Edit Chart Data",
}: ChartDataEditorDialogProps) {
  const [localData, setLocalData] = useState<ChartDataType>(data);

  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  const addRow = () => {
    if (chartType === "label-value") {
      const newData = [
        ...(localData as LabelValueData[]),
        { label: "", value: 0 },
      ];
      setLocalData(newData as ChartDataType);
    } else {
      const newData = [...(localData as XYData[]), { x: 0, y: 0 }];
      setLocalData(newData as ChartDataType);
    }
  };

  const removeRow = (index: number) => {
    if (chartType === "label-value") {
      const newData = [...(localData as LabelValueData[])];
      newData.splice(index, 1);
      setLocalData(newData as ChartDataType);
    } else {
      const newData = [...(localData as XYData[])];
      newData.splice(index, 1);
      setLocalData(newData as ChartDataType);
    }
  };

  const updateRow = (index: number, field: string, value: string | number) => {
    if (chartType === "label-value") {
      const newData = [...(localData as LabelValueData[])];
      newData[index] = {
        ...newData[index],
        [field]: field === "value" ? Number(value) || 0 : value,
      } as LabelValueData;
      setLocalData(newData as ChartDataType);
    } else {
      const newData = [...(localData as XYData[])];
      newData[index] = {
        ...newData[index],
        [field]: field === "x" || field === "y" ? Number(value) || 0 : value,
      } as XYData;
      setLocalData(newData as ChartDataType);
    }
  };

  const validateData = (): boolean => {
    if (chartType === "label-value") {
      const data = localData as LabelValueData[];
      return data.every(
        (row) => row.label.trim() !== "" && !Number.isNaN(row.value),
      );
    } else {
      const data = localData as XYData[];
      return data.every((row) => !Number.isNaN(row.x) && !Number.isNaN(row.y));
    }
  };

  const getRowValidationError = (
    index: number,
    field: string,
  ): string | null => {
    const row = (localData as (LabelValueData | XYData)[])[index];
    if (!row) return null;

    if (chartType === "label-value") {
      const labelValueRow = row as LabelValueData;
      if (field === "label" && labelValueRow.label.trim() === "") {
        return "Label cannot be empty";
      }
      if (field === "value" && Number.isNaN(labelValueRow.value)) {
        return "Value must be a number";
      }
    } else {
      const xyRow = row as XYData;
      if (
        (field === "x" || field === "y") &&
        Number.isNaN(xyRow[field as keyof XYData] as number)
      ) {
        return "Must be a number";
      }
    }
    return null;
  };

  const handleSave = () => {
    if (!validateData()) {
      // You could add a toast notification here for validation errors
      return;
    }
    onDataChange(localData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalData(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="ignore-click-outside/toolbar max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Edit the data for your chart. You can add, remove, and modify data
            points.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                {chartType === "label-value"
                  ? "Label & Value Data"
                  : "X & Y Coordinate Data"}
              </h3>
              <Button onClick={addRow} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {chartType === "label-value" ? (
                      <>
                        <TableHead className="w-[200px]">Label</TableHead>
                        <TableHead className="w-[150px]">Value</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-[150px]">X</TableHead>
                        <TableHead className="w-[150px]">Y</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(localData as (LabelValueData | XYData)[]).map(
                    (row, index) => (
                      <TableRow key={index}>
                        {chartType === "label-value" ? (
                          <>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  value={(row as LabelValueData).label || ""}
                                  onChange={(e) =>
                                    updateRow(index, "label", e.target.value)
                                  }
                                  placeholder="Enter label"
                                  className={
                                    getRowValidationError(index, "label")
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {getRowValidationError(index, "label") && (
                                  <p className="text-xs text-red-500">
                                    {getRowValidationError(index, "label")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  value={(row as LabelValueData).value || 0}
                                  onChange={(e) =>
                                    updateRow(index, "value", e.target.value)
                                  }
                                  placeholder="0"
                                  className={
                                    getRowValidationError(index, "value")
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {getRowValidationError(index, "value") && (
                                  <p className="text-xs text-red-500">
                                    {getRowValidationError(index, "value")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  value={(row as XYData).x || 0}
                                  onChange={(e) =>
                                    updateRow(index, "x", e.target.value)
                                  }
                                  placeholder="0"
                                  className={
                                    getRowValidationError(index, "x")
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {getRowValidationError(index, "x") && (
                                  <p className="text-xs text-red-500">
                                    {getRowValidationError(index, "x")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  value={(row as XYData).y || 0}
                                  onChange={(e) =>
                                    updateRow(index, "y", e.target.value)
                                  }
                                  placeholder="0"
                                  className={
                                    getRowValidationError(index, "y")
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {getRowValidationError(index, "y") && (
                                  <p className="text-xs text-red-500">
                                    {getRowValidationError(index, "y")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(index)}
                            disabled={
                              (localData as (LabelValueData | XYData)[])
                                .length <= 1
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>

            {(localData as (LabelValueData | XYData)[]).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No data points. Click "Add Row" to get started.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!validateData()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
