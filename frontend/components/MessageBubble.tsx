'use client';

import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Bot,
  FileText,
  Globe,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CitationCard } from './CitationCard';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  filename?: string;
  totalPages?: number;
  onViewPage?: (filename: string, pageNumber: number, totalPages: number) => void;
}

export function MessageBubble({
  message,
  filename,
  totalPages,
  onViewPage,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showAllSources, setShowAllSources] = useState(false);

  const renderAnswer = () => {
    const parts = message.content.split('\n\n');
    return parts.map((part, index) => (
      <div key={index} className="mb-4 last:mb-0">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{part}</p>
      </div>
    ));
  };

  const documentSources =
    message.sources?.filter((s) => s.source_type === 'document') || [];
  const webSources =
    message.sources?.filter((s) => s.source_type === 'web') || [];

  /** ------------------ NEW: page → thumbnail map ------------------ */
  const pageThumbnailMap = useMemo(() => {
    const map = new Map<number, string>();
    message.relevant_images?.forEach((img) => {
      if (!map.has(img.page_number)) {
        map.set(img.page_number, img.image_base64);
      }
    });
    return map;
  }, [message.relevant_images]);

  /** ------------------ NEW: dedupe citations per page ------------------ */
  const uniqueCitationsByPage = useMemo(() => {
    const map = new Map<number, any>();
    (message.citations || []).forEach((citation) => {
      if (!map.has(citation.page_number)) {
        map.set(citation.page_number, citation);
      }
    });
    return Array.from(map.values());
  }, [message.citations]);

  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary">
            <User className="h-4 w-4 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex flex-col items-end">
          <Card className="px-4 py-3 max-w-[80%] bg-primary text-primary-foreground">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </Card>
          <span className="text-xs text-gray-500 mt-1">
            {formatDate(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-green-600">
          <Bot className="h-4 w-4 text-white" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 flex flex-col items-start max-w-full">
        <Card className="px-6 py-4 w-full bg-white border border-gray-200 shadow-sm">
          <div className="prose prose-sm max-w-none">{renderAnswer()}</div>

          {message.relevant_images && message.relevant_images.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <ImageIcon className="h-4 w-4" />
                <span>Relevant Images from Document:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {message.relevant_images.map((image) => (
                  <div
                    key={image.image_id}
                    className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:border-blue-400 transition-all shadow-sm"
                  >
                    <img
                      src={image.image_base64}
                      alt={image.caption}
                      className="w-full h-auto object-contain bg-gray-50 max-h-[300px]"
                    />
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-xs text-gray-800 font-medium">
                        {image.caption}
                      </p>
                      <span className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <FileText className="h-3 w-3" />
                        Page {image.page_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uniqueCitationsByPage.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Document Citations
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uniqueCitationsByPage.map((citation) => (
                  <div
                    key={citation.citation_id}
                    className="flex gap-3 items-start"
                  >
                    {pageThumbnailMap.has(citation.page_number) && (
                      <img
                        src={pageThumbnailMap.get(citation.page_number)!}
                        alt={`Page ${citation.page_number}`}
                        className="w-14 h-18 object-contain border rounded-md bg-gray-50"
                      />
                    )}

                    <CitationCard
                      citation={citation}
                      filename={citation.filename || filename}
                      totalPages={totalPages}
                      onViewFullPage={onViewPage}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {webSources.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Web Sources
                </span>
              </div>
              <div className="space-y-2">
                {webSources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <Globe className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-green-700 hover:underline flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {source.snippet}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              {showAllSources ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              <span>
                Sources: {documentSources.length} page
                {documentSources.length !== 1 ? 's' : ''}
              </span>
            </button>
          </div>
        </Card>

        <span className="text-xs text-gray-500 mt-2">
          {formatDate(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
