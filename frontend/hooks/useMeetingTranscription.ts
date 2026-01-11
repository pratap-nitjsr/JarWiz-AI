'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { DEEPGRAM_API_KEY, DEEPGRAM_CONFIG } from '@/lib/constants';

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'remote' | 'unknown';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface MeetingTranscriptionState {
  isCapturing: boolean;
  isTranscribing: boolean;
  transcripts: TranscriptEntry[];
  error: string | null;
  tabAudioSupported: boolean;
}

export function useMeetingTranscription() {
  const [state, setState] = useState<MeetingTranscriptionState>({
    isCapturing: false,
    isTranscribing: false,
    transcripts: [],
    error: null,
    tabAudioSupported: typeof navigator !== 'undefined' && 
      typeof navigator.mediaDevices !== 'undefined' && 
      'getDisplayMedia' in navigator.mediaDevices,
  });

  // Refs for managing streams and connections
  const tabStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const tabConnectionRef = useRef<LiveClient | null>(null);
  const micConnectionRef = useRef<LiveClient | null>(null);
  const tabAudioContextRef = useRef<AudioContext | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const tabProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Generate unique ID for transcript entries
  const generateId = () => `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add transcript entry
  const addTranscript = useCallback((speaker: 'user' | 'remote', text: string, isFinal: boolean) => {
    if (!text.trim()) return;

    setState(prev => {
      // If not final, update the last interim for this speaker or add new
      if (!isFinal) {
        const lastIndex = prev.transcripts.findLastIndex(t => t.speaker === speaker && !t.isFinal);
        if (lastIndex !== -1) {
          const updated = [...prev.transcripts];
          updated[lastIndex] = { ...updated[lastIndex], text, timestamp: new Date() };
          return { ...prev, transcripts: updated };
        }
      }

      // For final transcripts, replace interim with final or add new
      const transcripts = prev.transcripts.filter(t => t.isFinal || t.speaker !== speaker);
      
      return {
        ...prev,
        transcripts: [
          ...transcripts,
          {
            id: generateId(),
            speaker,
            text,
            timestamp: new Date(),
            isFinal,
          }
        ]
      };
    });
  }, []);

  // Create Deepgram connection for a stream
  const createDeepgramConnection = useCallback((
    stream: MediaStream,
    speaker: 'user' | 'remote',
    audioContextRef: React.MutableRefObject<AudioContext | null>,
    processorRef: React.MutableRefObject<ScriptProcessorNode | null>
  ): LiveClient | null => {
    if (!DEEPGRAM_API_KEY) {
      setState(prev => ({ ...prev, error: 'Deepgram API key not configured' }));
      return null;
    }

    try {
      const deepgram = createClient(DEEPGRAM_API_KEY);
      const connection = deepgram.listen.live({
        model: DEEPGRAM_CONFIG.model,
        language: DEEPGRAM_CONFIG.language,
        interim_results: true,
        smart_format: true,
        punctuate: true,
        diarize: false, // We handle speaker separation manually
        encoding: 'linear16',
        sample_rate: 16000,
      });

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log(`[${speaker}] Deepgram connection opened`);
        setState(prev => ({ ...prev, isTranscribing: true }));
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcriptText = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final || false;
        
        if (transcriptText) {
          addTranscript(speaker, transcriptText, isFinal);
        }
      });

      connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error(`[${speaker}] Deepgram error:`, error);
        setState(prev => ({ ...prev, error: `Transcription error for ${speaker}` }));
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log(`[${speaker}] Deepgram connection closed`);
      });

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (connection.getReadyState() !== 1) return; // Only send if connected

        const input = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);

        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        connection.send(buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      return connection;
    } catch (error: any) {
      console.error(`Error creating Deepgram connection for ${speaker}:`, error);
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, [addTranscript]);

  // Start screen capture with tab audio
  const startCapture = useCallback(async (includeMicrophone: boolean = true) => {
    try {
      setState(prev => ({ ...prev, error: null, isCapturing: false }));

      // Request screen capture with audio - browser will show picker for tab/window/screen
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: 'browser', // Prefer browser tabs
        },
        audio: true, // Request audio - user must check "Share tab audio"
      };

      // @ts-ignore - Add Chrome-specific options
      displayMediaOptions.preferCurrentTab = false;
      // @ts-ignore
      displayMediaOptions.selfBrowserSurface = 'exclude';
      // @ts-ignore  
      displayMediaOptions.systemAudio = 'include';
      // @ts-ignore - Allow switching tabs during capture
      displayMediaOptions.surfaceSwitching = 'include';

      const tabStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      // Check if we got audio
      const audioTracks = tabStream.getAudioTracks();
      if (audioTracks.length === 0) {
        // Stop video track since we didn't get audio
        tabStream.getTracks().forEach(track => track.stop());
        throw new Error('No audio captured. Please make sure to check "Share tab audio" checkbox when selecting the tab.');
      }

      tabStreamRef.current = tabStream;

      // Handle stream ending (user clicks stop sharing)
      tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopCapture();
      });

      // Create audio-only stream for tab
      const tabAudioStream = new MediaStream(audioTracks);
      
      // Start transcription for tab audio (remote speaker)
      const tabConnection = createDeepgramConnection(
        tabAudioStream,
        'remote',
        tabAudioContextRef,
        tabProcessorRef
      );
      tabConnectionRef.current = tabConnection;

      // Optionally capture microphone (local user)
      if (includeMicrophone) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
          micStreamRef.current = micStream;

          const micConnection = createDeepgramConnection(
            micStream,
            'user',
            micAudioContextRef,
            micProcessorRef
          );
          micConnectionRef.current = micConnection;
        } catch (micError) {
          console.warn('Microphone access denied, continuing with tab audio only');
        }
      }

      setState(prev => ({ 
        ...prev, 
        isCapturing: true, 
        error: null 
      }));

    } catch (error: any) {
      console.error('Error starting capture:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to start screen capture',
        isCapturing: false 
      }));
    }
  }, [createDeepgramConnection]);

  // Stop all capture and transcription
  const stopCapture = useCallback(() => {
    // Close Deepgram connections
    tabConnectionRef.current?.requestClose();
    micConnectionRef.current?.requestClose();
    tabConnectionRef.current = null;
    micConnectionRef.current = null;

    // Disconnect audio processors
    tabProcessorRef.current?.disconnect();
    micProcessorRef.current?.disconnect();
    tabProcessorRef.current = null;
    micProcessorRef.current = null;

    // Close audio contexts
    tabAudioContextRef.current?.close();
    micAudioContextRef.current?.close();
    tabAudioContextRef.current = null;
    micAudioContextRef.current = null;

    // Stop streams
    tabStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    tabStreamRef.current = null;
    micStreamRef.current = null;

    setState(prev => ({
      ...prev,
      isCapturing: false,
      isTranscribing: false,
    }));
  }, []);

  // Clear all transcripts
  const clearTranscripts = useCallback(() => {
    setState(prev => ({ ...prev, transcripts: [] }));
  }, []);

  // Get full transcript as formatted text
  const getFullTranscript = useCallback(() => {
    return state.transcripts
      .filter(t => t.isFinal)
      .map(t => `${t.speaker === 'user' ? 'You' : 'Other'}: ${t.text}`)
      .join('\n');
  }, [state.transcripts]);

  // Get transcript for context (for AI)
  const getTranscriptForContext = useCallback(() => {
    return state.transcripts
      .filter(t => t.isFinal)
      .map(t => ({
        role: t.speaker === 'user' ? 'student' : 'other_participant',
        content: t.text,
        timestamp: t.timestamp.toISOString(),
      }));
  }, [state.transcripts]);

  // Get the video stream for preview
  const getVideoStream = useCallback(() => {
    return tabStreamRef.current;
  }, []);

  return {
    ...state,
    startCapture,
    stopCapture,
    clearTranscripts,
    getFullTranscript,
    getTranscriptForContext,
    getVideoStream,
  };
}
