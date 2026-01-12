// components/export-ppt-button.tsx
"use client";

import { exportPresentation } from "@/app/_actions/presentation/exportPresentationActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { themes } from "@/lib/presentation/themes";
import { usePresentationState } from "@/states/presentation-state";
import { Download } from "lucide-react";
import { useState } from "react";

interface ExportPPTButtonProps {
  presentationId: string;
  fileName?: string;
}

export function ExportButton({
  presentationId,
  fileName = "presentation",
}: ExportPPTButtonProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const theme = usePresentationState((s) => s.theme);
  const customThemeData = usePresentationState((s) => s.customThemeData);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build theme colors to pass to server (always use LIGHT palette for PPT)
      const themeColors = (() => {
        if (customThemeData) {
          const colors = customThemeData.colors.light;
          return {
            primary: colors.primary.replace("#", ""),
            secondary: colors.secondary.replace("#", ""),
            accent: colors.accent.replace("#", ""),
            background: colors.background.replace("#", ""),
            text: colors.text.replace("#", ""),
            heading: colors.heading.replace("#", ""),
            muted: colors.muted.replace("#", ""),
          };
        }
        if (typeof theme === "string" && theme in themes) {
          const t = themes[theme as keyof typeof themes];
          const colors = t.colors.light;
          return {
            primary: colors.primary.replace("#", ""),
            secondary: colors.secondary.replace("#", ""),
            accent: colors.accent.replace("#", ""),
            background: colors.background.replace("#", ""),
            text: colors.text.replace("#", ""),
            heading: colors.heading.replace("#", ""),
            muted: colors.muted.replace("#", ""),
          };
        }
        return undefined;
      })();

      const result = await exportPresentation(
        presentationId,
        fileName,
        themeColors,
      );

      if (result.success && result.data) {
        // Create blob from base64 data
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName ?? `${fileName}.pptx`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(link);

        toast({
          title: "Export Successful",
          description: "Your presentation has been exported successfully.",
          variant: "default",
        });

        setIsExportDialogOpen(false);
      } else {
        throw new Error(result.error ?? "Export failed");
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your presentation.",
        variant: "destructive",
      });
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Presentation</DialogTitle>
          <DialogDescription>
            Export your presentation to PowerPoint format.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will export your current presentation as a PowerPoint (.pptx)
            file, including all slides and elements.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsExportDialogOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export to PowerPoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
