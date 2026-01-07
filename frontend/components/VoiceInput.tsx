'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Trash2 } from 'lucide-react';
import { useDeepgram } from '@/hooks/useDeepgram';

interface VoiceInputProps {
  onTranscriptComplete: (transcript: string) => void;
}

export function VoiceInput({ onTranscriptComplete }: VoiceInputProps) {
  const { isRecording, transcript, error, startRecording, stopRecording, clearTranscript } =
    useDeepgram();

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      if (transcript.trim()) {
        onTranscriptComplete(transcript.trim());
        clearTranscript();
      }
    } else {
      await startRecording();
    }
  };

  const handleClear = () => {
    clearTranscript();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleToggleRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="icon"
          className="relative"
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            </>
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {transcript && !isRecording && (
          <Button onClick={handleClear} variant="outline" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        <span className="text-sm text-gray-600">
          {isRecording ? 'Recording... (click to stop)' : 'Click to start voice input'}
        </span>
      </div>

      {/* Real-time transcript display */}
      {(transcript || isRecording) && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm text-gray-700">
              {transcript || 'Listening...'}
              {isRecording && <span className="animate-pulse">▋</span>}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
