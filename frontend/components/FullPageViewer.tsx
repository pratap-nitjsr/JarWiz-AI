"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import api from "@/lib/api";
import Image from "next/image";

interface FullPageViewerProps {
  filename: string;
  pageNumber: number;
  onClose: () => void;
  totalPages?: number;
}

export function FullPageViewer({ filename, pageNumber, onClose, totalPages = 1 }: FullPageViewerProps) {
  const [currentPage, setCurrentPage] = useState(pageNumber);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  const fetchPage = async (page: number) => {
    try {
      setLoading(true);
      const response = await api.getFullPage(filename, page);
      setPageImage(response.image);
    } catch (err) {
      console.error("Error fetching page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(currentPage);
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 25, 50));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Page {currentPage + 1}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{filename}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleZoomOut}
                variant="outline"
                size="sm"
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[4rem] text-center">
                {zoom}%
              </span>
              <Button
                onClick={handleZoomIn}
                variant="outline"
                size="sm"
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button
                onClick={handlePrevPage}
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[5rem] text-center">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                onClick={handleNextPage}
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : pageImage ? (
            <div 
              className="flex items-center justify-center"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
            >
              <img
                src={`data:image/png;base64,${pageImage}`}
                alt={`Page ${currentPage + 1}`}
                className="max-w-full h-auto shadow-lg"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Failed to load page
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
