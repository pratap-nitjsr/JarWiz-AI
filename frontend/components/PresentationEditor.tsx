'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Download,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Edit3,
  Check,
  RefreshCw,
  Presentation,
  Wand2,
} from 'lucide-react';
import api from '@/lib/api';
import { SlideParser } from '@/lib/slideParser';
import { exportToPPTX } from '@/lib/exportToPPT';
import type { Slide, SlideElement } from '@/types/presentation';

interface PresentationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  aiResponses: { question: string; answer: string }[];
}

type GenerationStep = 'input' | 'generating-outline' | 'editing-outline' | 'generating-slides' | 'viewing';

export function PresentationEditor({ isOpen, onClose, transcript, aiResponses }: PresentationEditorProps) {
  const [step, setStep] = useState<GenerationStep>('input');
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(5);
  const [outline, setOutline] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const parserRef = useRef<SlideParser | null>(null);

  // Build context from transcript and AI responses
  const buildContext = () => {
    let context = '';
    
    if (transcript) {
      context += `Meeting Transcript:\n${transcript}\n\n`;
    }
    
    if (aiResponses.length > 0) {
      context += `Key Q&A from Meeting:\n`;
      aiResponses.forEach((item) => {
        context += `Q: ${item.question}\nA: ${item.answer}\n\n`;
      });
    }
    
    return context;
  };

  // Auto-suggest topic from context
  const suggestTopic = async () => {
    const context = buildContext();
    if (!context || context.length < 50) {
      return;
    }

    setIsLoadingTopic(true);
    try {
      const result = await api.suggestPresentationTopic(context);
      if (result.topic) {
        setTopic(result.topic);
      }
    } catch (err) {
      console.error('Error suggesting topic:', err);
    } finally {
      setIsLoadingTopic(false);
    }
  };

  // Generate outline from topic
  const generateOutline = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for the presentation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setOutline('');
    setStep('generating-outline');

    const context = buildContext();

    try {
      await api.generatePresentationOutline(
        topic,
        numSlides,
        context,
        (chunk) => {
          setOutline((prev) => prev + chunk);
        },
        () => {
          setIsGenerating(false);
          setStep('editing-outline');
        },
        (errorMsg) => {
          setError(errorMsg);
          setIsGenerating(false);
          setStep('input');
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate outline');
      setIsGenerating(false);
      setStep('input');
    }
  };

  // Generate slides from outline
  const generateSlides = async () => {
    if (!outline.trim()) {
      setError('No outline to generate slides from');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSlides([]);
    setStep('generating-slides');
    
    // Create a fresh parser
    parserRef.current = new SlideParser();
    const context = buildContext();

    try {
      await api.generatePresentationSlides(
        topic,
        outline,
        context,
        (chunk) => {
          if (parserRef.current) {
            const newSlides = parserRef.current.parseChunk(chunk);
            if (newSlides.length > 0) {
              setSlides(parserRef.current.getAllSlides());
            }
          }
        },
        () => {
          // Finalize parsing
          if (parserRef.current) {
            parserRef.current.finalize();
            setSlides(parserRef.current.getAllSlides());
          }
          setIsGenerating(false);
          setStep('viewing');
          setCurrentSlideIndex(0);
        },
        (errorMsg) => {
          setError(errorMsg);
          setIsGenerating(false);
          setStep('editing-outline');
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate slides');
      setIsGenerating(false);
      setStep('editing-outline');
    }
  };

  // Save presentation to Cloudinary
  const savePresentation = async () => {
    if (slides.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      await api.savePresentation(topic, slides, outline);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save presentation');
    } finally {
      setIsSaving(false);
    }
  };

  // Download as PPTX
  const [isDownloading, setIsDownloading] = useState(false);
  
  const downloadPresentation = async () => {
    if (slides.length === 0) return;
    
    try {
      setIsDownloading(true);
      await exportToPPTX(slides, { title: topic || 'Presentation' });
    } catch (err: any) {
      console.error('Download failed:', err);
      setError('Failed to generate PPTX file');
    } finally {
      setIsDownloading(false);
    }
  };

  // Reset state when opening and auto-suggest topic
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setTopic('');
      setOutline('');
      setSlides([]);
      setError(null);
      setCurrentSlideIndex(0);
      
      // Auto-suggest topic if there's context
      const context = buildContext();
      if (context && context.length >= 50) {
        suggestTopic();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 z-50 flex flex-col bg-background rounded-lg shadow-lg border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Presentation className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">Create Presentation</h2>
            {step !== 'input' && (
              <Badge variant="outline" className="ml-2">
                {step === 'generating-outline' && 'Generating Outline...'}
                {step === 'editing-outline' && 'Edit Outline'}
                {step === 'generating-slides' && 'Generating Slides...'}
                {step === 'viewing' && `Slide ${currentSlideIndex + 1} of ${slides.length}`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'viewing' && slides.length > 0 && (
              <>
                <Button
                  onClick={savePresentation}
                  disabled={isSaving}
                  variant="outline"
                  size="sm"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveSuccess ? 'Saved!' : 'Save to Cloud'}
                </Button>
                <Button
                  onClick={downloadPresentation}
                  variant="outline"
                  size="sm"
                  disabled={isDownloading || slides.length === 0}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isDownloading ? 'Exporting...' : 'Download PPTX'}
                </Button>
              </>
            )}
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Generate Presentation from Meeting</h3>
                <p className="text-muted-foreground">
                  AI will create a presentation based on your meeting transcript and Q&A
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Presentation Topic</label>
                  <div className="flex gap-2">
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={isLoadingTopic ? "Generating topic..." : "e.g., Q3 Sales Review, Project Update, Meeting Summary"}
                      className="flex-1"
                      disabled={isLoadingTopic}
                    />
                    <Button
                      onClick={suggestTopic}
                      disabled={isLoadingTopic || (!transcript && aiResponses.length === 0)}
                      variant="outline"
                      title="Auto-generate topic from meeting content"
                    >
                      {isLoadingTopic ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {isLoadingTopic && (
                    <p className="text-xs text-muted-foreground mt-1">Analyzing meeting content...</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Number of Slides</label>
                  <Input
                    type="number"
                    value={numSlides}
                    onChange={(e) => setNumSlides(Math.max(3, Math.min(20, parseInt(e.target.value) || 5)))}
                    min={3}
                    max={20}
                    className="w-32"
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Content Sources</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>
                        Transcript: {transcript ? `${transcript.split(/\s+/).length} words` : 'None'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>
                        AI Q&A: {aiResponses.length} responses
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={generateOutline}
                  disabled={!topic.trim() || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Outline
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Generating Outline */}
          {step === 'generating-outline' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                <h3 className="text-xl font-semibold mb-2">Generating Outline...</h3>
              </div>
              
              <div className="bg-muted rounded-lg p-4 min-h-[300px]">
                <pre className="whitespace-pre-wrap text-sm font-mono">{outline}</pre>
              </div>
            </div>
          )}

          {/* Step 3: Edit Outline */}
          {step === 'editing-outline' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-4">
                <Edit3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="text-lg font-semibold">Review & Edit Outline</h3>
                <p className="text-sm text-muted-foreground">
                  Edit the outline below, then generate slides
                </p>
              </div>
              
              <Textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('input')}
                  variant="outline"
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={generateOutline}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={generateSlides}
                  disabled={!outline.trim() || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Slides
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Generating Slides */}
          {step === 'generating-slides' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                <h3 className="text-xl font-semibold mb-2">Generating Slides...</h3>
                <p className="text-muted-foreground">
                  {slides.length} slides created so far
                </p>
              </div>
              
              {slides.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {slides.map((slide, idx) => (
                    <SlidePreview key={idx} slide={slide} index={idx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: View/Edit Slides */}
          {step === 'viewing' && slides.length > 0 && (
            <div className="h-full flex flex-col">
              {/* Slide Navigator */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <Button
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  variant="outline"
                  size="icon"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm font-medium">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <Button
                  onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === slides.length - 1}
                  variant="outline"
                  size="icon"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Main Slide View */}
              <div className="flex-1 flex gap-6">
                {/* Slide Thumbnails */}
                <div className="w-48 space-y-2 overflow-auto">
                  {slides.map((slide, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-full rounded-lg border transition-colors ${
                        idx === currentSlideIndex
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <SlidePreview slide={slide} index={idx} compact />
                    </button>
                  ))}
                </div>

                {/* Current Slide */}
                <div className="flex-1 bg-white rounded-lg shadow-lg p-8 aspect-[16/9] overflow-auto">
                  <SlideContent slide={slides[currentSlideIndex]} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Slide Preview Thumbnail
function SlidePreview({ slide, index, compact = false }: { slide: Slide; index: number; compact?: boolean }) {
  const headingElement = slide.content?.find((el: SlideElement) => 
    el.type === 'h1' || el.type === 'h2' || el.type === 'h3'
  );
  const title = headingElement?.children?.[0]?.text || `Slide ${index + 1}`;
  
  return (
    <div className={`bg-white rounded border ${compact ? 'p-2' : 'p-3'} aspect-[16/9]`}>
      <p className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
        {typeof title === 'string' ? title : 'Slide'}
      </p>
      <p className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {slide.content?.length || 0} elements
      </p>
    </div>
  );
}

// Slide Content Renderer
function SlideContent({ slide }: { slide: Slide }) {
  return (
    <div className="h-full flex flex-col">
      {slide.content?.map((element: SlideElement, idx: number) => (
        <SlideElementRenderer key={idx} element={element} />
      ))}
    </div>
  );
}

// Element Renderer
function SlideElementRenderer({ element }: { element: SlideElement }) {
  // Handle heading elements
  if (element.type === 'h1' || element.type === 'h2' || element.type === 'h3') {
    const text = element.children?.map((child: any) => child.text || '').join('') || '';
    const fontSize = element.type === 'h1' ? 'text-3xl' : element.type === 'h2' ? 'text-2xl' : 'text-xl';
    return (
      <h2 className={`${fontSize} font-bold text-gray-900 mb-4`}>
        {text}
      </h2>
    );
  }
  
  // Handle paragraph elements
  if (element.type === 'p') {
    const text = element.children?.map((child: any) => child.text || '').join('') || '';
    return (
      <p className="text-gray-700 mb-3">
        {text}
      </p>
    );
  }
  
  // Handle bullet groups
  if (element.type === 'bullets' && Array.isArray(element.children)) {
    return (
      <ul className="list-disc list-inside space-y-2 mb-4">
        {element.children.map((item: any, idx: number) => {
          const text = item.children?.map((child: any) => child.text || '').join('') || '';
          return (
            <li key={idx} className="text-gray-700">
              {text}
            </li>
          );
        })}
      </ul>
    );
  }
  
  // Handle image elements
  if (element.type === 'img') {
    return (
      <div className="my-4 p-4 bg-gray-100 rounded-lg text-center text-gray-500">
        <span className="text-sm">📷 Image: {element.query || 'No query'}</span>
      </div>
    );
  }
  
  // Handle icon lists
  if (element.type === 'icons' && Array.isArray(element.children)) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-4">
        {element.children.map((item: any, idx: number) => {
          const text = item.children?.map((child: any) => child.text || '').join('') || '';
          return (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg text-center">
              <span className="text-2xl mb-2 block">📌</span>
              <span className="text-sm text-gray-700">{text}</span>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Handle timeline
  if (element.type === 'timeline' && Array.isArray(element.children)) {
    return (
      <div className="space-y-3 mb-4 border-l-2 border-primary pl-4">
        {element.children.map((item: any, idx: number) => {
          const text = item.children?.map((child: any) => child.text || '').join('') || '';
          return (
            <div key={idx} className="relative">
              <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-primary" />
              <p className="text-gray-700">{text}</p>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Handle arrows
  if (element.type === 'arrows' && Array.isArray(element.children)) {
    return (
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {element.children.map((item: any, idx: number) => {
          const text = item.children?.map((child: any) => child.text || '').join('') || '';
          return (
            <div key={idx} className="flex items-center">
              <span className="px-3 py-2 bg-primary/10 rounded text-sm">{text}</span>
              {idx < element.children.length - 1 && <span className="mx-2 text-primary">→</span>}
            </div>
          );
        })}
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="my-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
      {element.type}: {JSON.stringify(element.children || element).slice(0, 100)}
    </div>
  );
}
