'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import type { Citation } from '@/types';

interface CitationCardProps {
  citation: Citation;
  filename?: string;
  totalPages?: number;
  onViewFullPage?: (filename: string, pageNumber: number, totalPages: number) => void;
}

export function CitationCard({ citation, filename, totalPages = 1, onViewFullPage }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleViewFullPage = () => {
    if (onViewFullPage && filename) {
      onViewFullPage(filename, citation.page_number, totalPages);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <FileText className="h-4 w-4 mt-0.5 text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Page {citation.page_number + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(citation.relevance_score * 100)}% match
                </Badge>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{citation.text_snippet}</p>
              {filename && onViewFullPage && (
                <Button
                  onClick={handleViewFullPage}
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1 text-xs"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  View full page
                </Button>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Expanded view with page image */}
        {isExpanded && citation.image_base64 && (
          <div className="mt-3 border-t pt-3">
            <img
              src={`data:image/png;base64,${citation.image_base64}`}
              alt={`Page ${citation.page_number + 1}`}
              className="w-full h-auto rounded"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
