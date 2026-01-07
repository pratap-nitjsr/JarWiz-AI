'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { formatFileSize } from '@/lib/utils';
import type { Document } from '@/types';

interface DocumentUploaderProps {
  onUploadSuccess: (document: Document) => void;
  onUploadError?: (error: string) => void;
}

export function DocumentUploader({ onUploadSuccess, onUploadError }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setUploading(true);
    setProgress(0);
    setUploadStatus('idle');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiClient.uploadDocument(file);

      clearInterval(progressInterval);
      setProgress(100);
      setUploadStatus('success');

      const document: Document = {
        id: response.document_id,
        filename: response.filename,
        total_pages: response.total_pages,
        upload_date: new Date(),
      };

      onUploadSuccess(document);
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: uploading,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-12 w-12 text-gray-400" />
            
            {isDragActive ? (
              <p className="text-lg">Drop the PDF file here...</p>
            ) : (
              <>
                <p className="text-lg">Drag and drop a PDF file here, or click to select</p>
                <p className="text-sm text-gray-500">
                  Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
                </p>
              </>
            )}
          </div>
        </div>

        {uploadedFile && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <File className="h-5 w-5" />
              <span className="text-sm font-medium">{uploadedFile.name}</span>
              {uploadStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {uploadStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-gray-500">Uploading and processing...</p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <p className="text-sm text-green-600">Document uploaded successfully!</p>
            )}

            {uploadStatus === 'error' && (
              <p className="text-sm text-red-600">Failed to upload document. Please try again.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
