'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { DEEPGRAM_API_KEY, DEEPGRAM_CONFIG } from '@/lib/constants';
import type { VoiceInputState } from '@/types';

export function useDeepgram() {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: '',
    error: null,
  });

  const connectionRef = useRef<LiveClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startRecording = useCallback(async () => {
    try {
      if (!DEEPGRAM_API_KEY) throw new Error('Deepgram API key not configured');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const deepgram = createClient(DEEPGRAM_API_KEY);
      const connection = deepgram.listen.live({
        model: DEEPGRAM_CONFIG.model,
        language: DEEPGRAM_CONFIG.language,
        interim_results: true,
        smart_format: true,
        encoding: 'linear16',
        sample_rate: 16000,
      });

      connectionRef.current = connection;

      connection.on(LiveTranscriptionEvents.Open, () => {
        setState((p) => ({ ...p, isRecording: true, error: null }));
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcriptText = data.channel?.alternatives?.[0]?.transcript;
        if (data.is_final && transcriptText) {
          setState((p) => ({
            ...p,
            transcript: p.transcript + (p.transcript ? ' ' : '') + transcriptText,
          }));
        }
      });

      connection.on(LiveTranscriptionEvents.Error, () => {
        setState((p) => ({ ...p, error: 'Transcription error' }));
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!connectionRef.current) return;

        const input = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);

        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        connectionRef.current.send(buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (e: any) {
      setState((p) => ({ ...p, error: e.message || 'Failed to start recording' }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    connectionRef.current?.finish();

    processorRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    connectionRef.current = null;

    setState((p) => ({ ...p, isRecording: false }));
  }, []);

  const clearTranscript = useCallback(() => {
    setState((p) => ({ ...p, transcript: '' }));
  }, []);

  useEffect(() => () => stopRecording(), [stopRecording]);

  return { ...state, startRecording, stopRecording, clearTranscript };
}
