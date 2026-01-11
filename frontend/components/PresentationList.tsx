'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Presentation, Download, Trash2, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api';
import { exportToPPTX } from '@/lib/exportToPPT';
import type { Slide } from '@/types/presentation';

interface PresentationItem {
  presentation_id: string;
  title: string;
  slide_count: number;
  cloudinary_url?: string;
  created_at: string;
}

interface PresentationListProps {
  onViewPresentation?: (presentationId: string) => void;
}

export default function PresentationList({ onViewPresentation }: PresentationListProps) {
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const pageSize = 6;

  const fetchPresentations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listPresentations(pageSize, page * pageSize);
      setPresentations(response.presentations);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presentations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresentations();
  }, [page]);

  const handleDownload = async (presentationId: string) => {
    try {
      setDownloadingId(presentationId);
      const presentation = await apiClient.getPresentation(presentationId);
      await exportToPPTX(presentation.slides as Slide[], { title: presentation.title });
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download presentation');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (presentationId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    
    try {
      setDeletingId(presentationId);
      await apiClient.deletePresentation(presentationId);
      // Remove from local state
      setPresentations(prev => prev.filter(p => p.presentation_id !== presentationId));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete presentation');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && presentations.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            My Presentations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            My Presentations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchPresentations} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (presentations.length === 0 && !loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            My Presentations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Presentation className="h-12 w-12 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No presentations yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Create presentations from your meeting transcripts
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Presentation className="h-5 w-5" />
          My Presentations ({total})
        </CardTitle>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presentations.map((pres) => (
            <Card 
              key={pres.presentation_id} 
              className="bg-gray-700/50 border-gray-600 hover:bg-gray-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate" title={pres.title}>
                      {pres.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {pres.slide_count} slides
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatDate(pres.created_at)}
                    </p>
                  </div>
                  <Presentation className="h-8 w-8 text-blue-500 flex-shrink-0" />
                </div>
                
                <div className="flex gap-2 mt-4">
                  {onViewPresentation && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onViewPresentation(pres.presentation_id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(pres.presentation_id)}
                    disabled={downloadingId === pres.presentation_id}
                  >
                    {downloadingId === pres.presentation_id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    PPTX
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(pres.presentation_id, pres.title)}
                    disabled={deletingId === pres.presentation_id}
                  >
                    {deletingId === pres.presentation_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
