"use client";

import { ThemeBackground } from "@/components/presentation/theme/ThemeBackground";
import { type ThemeProperties } from "@/lib/presentation/themes";
import { usePresentationState } from "@/states/presentation-state";
import type React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CustomThemeFontLoader } from "./FontLoader";
import { LoadingState } from "./Loading";
import { SlidePreview } from "./SlidePreview";

interface PresentationLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
  themeData?: ThemeProperties;
  isShared?: boolean;
}

export function PresentationLayout({
  children,
  isLoading = false,
  themeData,
  isShared = false,
}: PresentationLayoutProps) {
  const isPresenting = usePresentationState((s) => s.isPresenting);

  // Sidebar interactions moved to SlidePreview

  if (isLoading) {
    return <LoadingState />;
  }

  // Hide sidebar in shared mode and when presenting
  const showSidebar = !isShared && !isPresenting;

  return (
    <ThemeBackground className="h-full w-full">
      <DndProvider backend={HTML5Backend}>
        {themeData && <CustomThemeFontLoader themeData={themeData} />}
        <div className="flex h-full">
          <SlidePreview showSidebar={showSidebar} />
          {/* Main Presentation Content - Scrollable */}
          <div className="presentation-slides flex max-h-full flex-1 overflow-auto pb-20">
            {children}
          </div>
        </div>
      </DndProvider>
    </ThemeBackground>
  );
}
