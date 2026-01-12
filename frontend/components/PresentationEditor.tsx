'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
  Check,
  RefreshCw,
  Presentation,
  Palette,
  Plus,
  Trash2,
  Settings,
  Layers,
  AlignLeft,
  Image as ImageIcon,
  ArrowRight,
  Upload,
  Eye,
  Edit3,
  Grid,
  LayoutGrid,
} from 'lucide-react';
import api from '@/lib/api';
import { exportToPPTX } from '@/lib/exportToPPT';
import { usePresentationState } from '@/states/presentation-state';
import { themes, setThemeVariables, type ThemeName, type ThemeProperties } from '@/lib/presentation/themes';
import type { PlateSlide } from '@/components/presentation/utils/parser';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Dynamic import for heavy Plate editor
const PlateEditor = React.lazy(() => import('@/components/presentation/editor/presentation-editor'));

interface PresentationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  aiResponses: { question: string; answer: string }[];
}

interface PresentationSettings {
  title: string;
  theme: ThemeName;
  numSlides: number;
  style: string;
  contentStyle: string;
  outline: string[];
}

// Theme list for UI
const THEME_LIST: { id: ThemeName; name: string; desc: string; primary: string; bg: string }[] = [
  { id: 'daktilo', name: 'Daktilo', desc: 'Modern & Clean', primary: themes.daktilo.colors.light.primary, bg: themes.daktilo.colors.light.background },
  { id: 'cornflower', name: 'Cornflower', desc: 'Professional', primary: themes.cornflower.colors.light.primary, bg: themes.cornflower.colors.light.background },
  { id: 'orbit', name: 'Orbit', desc: 'Futuristic', primary: themes.orbit.colors.light.primary, bg: themes.orbit.colors.light.background },
  { id: 'piano', name: 'Piano', desc: 'Classic', primary: themes.piano.colors.light.primary, bg: themes.piano.colors.light.background },
  { id: 'mystique', name: 'Mystique', desc: 'Sophisticated', primary: themes.mystique.colors.light.primary, bg: themes.mystique.colors.light.background },
  { id: 'gammaDark', name: 'Gamma', desc: 'High Contrast', primary: themes.gammaDark.colors.dark.primary, bg: themes.gammaDark.colors.dark.background },
  { id: 'crimson', name: 'Crimson', desc: 'Bold', primary: themes.crimson.colors.light.primary, bg: themes.crimson.colors.light.background },
  { id: 'sunset', name: 'Sunset', desc: 'Warm', primary: themes.sunset.colors.light.primary, bg: themes.sunset.colors.light.background },
  { id: 'forest', name: 'Forest', desc: 'Natural', primary: themes.forest.colors.light.primary, bg: themes.forest.colors.light.background },
];

const CONTENT_STYLES = [
  { id: 'balanced', name: 'Balanced', desc: 'Mix of text and visuals', icon: Layers },
  { id: 'text-heavy', name: 'Text Heavy', desc: 'More detailed content', icon: AlignLeft },
  { id: 'visual', name: 'Visual', desc: 'More images and graphics', icon: ImageIcon },
];

type GenerationStep =
  | 'ready'
  | 'configure-basics'
  | 'generating-outline'
  | 'review-outline'
  | 'generating-slides'
  | 'editing';

export function PresentationEditor({ isOpen, onClose, transcript, aiResponses }: PresentationEditorProps) {
  // Local state
  const [step, setStep] = useState<GenerationStep>('ready');
  const [localSettings, setLocalSettings] = useState<PresentationSettings>({
    title: '',
    theme: 'mystique',
    numSlides: 7,
    style: 'professional',
    contentStyle: 'balanced',
    outline: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [rawSlideData, setRawSlideData] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zustand state from presentation-ai
  const {
    slides,
    setSlides,
    currentSlideIndex,
    setCurrentSlideIndex,
    theme: globalTheme,
    setTheme: setGlobalTheme,
    isGeneratingPresentation,
    setIsGeneratingPresentation,
    setPresentationInput,
    setOutline: setGlobalOutline,
    setNumSlides: setGlobalNumSlides,
    resetForNewGeneration,
  } = usePresentationState();

  // Apply theme CSS variables when theme changes
  useEffect(() => {
    const themeData = themes[localSettings.theme];
    if (themeData) {
      setThemeVariables(themeData, localSettings.theme === 'gammaDark');
      setGlobalTheme(localSettings.theme);
    }
  }, [localSettings.theme, setGlobalTheme]);

  const buildContext = useCallback(() => {
    let context = '';
    if (transcript) context += `Meeting Transcript:\n${transcript}\n\n`;
    if (aiResponses.length > 0) {
      context += `Key Q&A:\n`;
      aiResponses.forEach((item) => {
        context += `Q: ${item.question}\nA: ${item.answer}\n\n`;
      });
    }
    return context;
  }, [transcript, aiResponses]);

  // Generate outline from context
  const generateOutline = async () => {
    const context = buildContext();
    if (!context || context.length < 50) {
      setError('Not enough content. Please add transcript or Q&A data.');
      return;
    }

    setStep('generating-outline');
    setError(null);
    setStatusMessage('Generating outline...');

    try {
      const result = await api.extractPresentationSettings(context);
      setLocalSettings(prev => ({
        ...prev,
        title: prev.title || result.settings.title,
        outline: result.settings.outline.slice(0, prev.numSlides),
      }));
      setStep('review-outline');
      setStatusMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to generate outline');
      setStep('configure-basics');
    }
  };

  // Generate slides using backend
  const generateSlides = async () => {
    setStep('generating-slides');
    setIsGeneratingPresentation(true);
    setError(null);
    setStatusMessage('Generating slides...');
    setRawSlideData('');
    setSlides([]);
    setGlobalOutline(localSettings.outline);
    setGlobalNumSlides(localSettings.outline.length);
    setPresentationInput(localSettings.title);

    const context = buildContext();

    try {
      await api.autoGeneratePresentation(
        context,
        {
          title: localSettings.title,
          theme: localSettings.theme,
          numSlides: localSettings.outline.length,
          style: localSettings.style,
          outline: localSettings.outline,
        },
        (message) => setStatusMessage(message),
        () => { },
        (chunk) => setRawSlideData((prev) => prev + chunk),
        () => {
          setStep('editing');
          setIsGeneratingPresentation(false);
          setStatusMessage('');
        },
        (errorMsg) => {
          setError(errorMsg);
          setStep('review-outline');
          setIsGeneratingPresentation(false);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate slides');
      setStep('review-outline');
      setIsGeneratingPresentation(false);
    }
  };

  // Parse raw JSON slides into PlateSlide format
  useEffect(() => {
    if (!rawSlideData) return;
    try {
      const parsed = JSON.parse(rawSlideData);
      let slideArray: any[] = [];

      if (parsed.slides && Array.isArray(parsed.slides)) {
        slideArray = parsed.slides;
      } else if (Array.isArray(parsed)) {
        slideArray = parsed;
      }

      // Convert to PlateSlide format
      const plateSlides: PlateSlide[] = slideArray.map((slide: any, idx: number) => ({
        id: slide.id || `slide-${idx}`,
        content: slide.children || [],
        layoutType: slide.layout || 'left',
        rootImage: slide.imageQuery ? { query: slide.imageQuery } : undefined,
        alignment: 'center',
      }));

      if (plateSlides.length > 0) {
        setSlides(plateSlides);
      }
    } catch {
      // Try partial parsing for streaming
      try {
        let content = rawSlideData.replace(/^\{"slides":\s*\[/, '').replace(/\]\}$/, '');
        const slideStrings: string[] = [];
        let depth = 0, currentSlide = '';
        for (let i = 0; i < content.length; i++) {
          const char = content[i];
          if (char === '{') depth++;
          if (char === '}') depth--;
          if (char === ',' && depth === 0) {
            if (currentSlide.trim()) slideStrings.push(currentSlide.trim());
            currentSlide = '';
          } else {
            currentSlide += char;
          }
        }
        if (currentSlide.trim()) slideStrings.push(currentSlide.trim());

        const plateSlides: PlateSlide[] = [];
        for (let idx = 0; idx < slideStrings.length; idx++) {
          try {
            const slide = JSON.parse(slideStrings[idx]);
            plateSlides.push({
              id: slide.id || `slide-${idx}`,
              content: slide.children || [],
              layoutType: slide.layout || 'left',
              rootImage: slide.imageQuery ? { query: slide.imageQuery } : undefined,
              alignment: 'center',
            });
          } catch { }
        }
        if (plateSlides.length > 0) setSlides(plateSlides);
      } catch { }
    }
  }, [rawSlideData, setSlides]);

  // Outline manipulation
  const addOutlineItem = () => setLocalSettings(prev => ({ ...prev, outline: [...prev.outline, 'New Topic'] }));
  const removeOutlineItem = (index: number) => setLocalSettings(prev => ({ ...prev, outline: prev.outline.filter((_, i) => i !== index) }));
  const updateOutlineItem = (index: number, value: string) => {
    const newOutline = [...localSettings.outline];
    newOutline[index] = value;
    setLocalSettings(prev => ({ ...prev, outline: newOutline }));
  };

  // Add slide
  const addSlide = () => {
    const newSlide: PlateSlide = {
      id: `slide-${Date.now()}`,
      content: [
        { type: 'h2', children: [{ text: 'New Slide' }] },
        { type: 'p', children: [{ text: 'Add your content here' }] },
      ],
      layoutType: 'left',
      alignment: 'center',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  // Remove slide
  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(Math.max(0, newSlides.length - 1));
    }
  };

  // Save presentation
  const savePresentation = async () => {
    if (slides.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.savePresentation(
        localSettings.title,
        slides.map(s => ({ ...s, children: s.content })),
        localSettings.outline.join('\n'),
        localSettings.theme,
        localSettings.style
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Download PPTX
  const downloadPresentation = async () => {
    if (slides.length === 0) return;
    try {
      setIsDownloading(true);
      const exportSlides = slides.map(s => ({
        ...s,
        children: s.content,
      }));
      await exportToPPTX(exportSlides as any, { title: localSettings.title || 'Presentation' });
    } catch {
      setError('Failed to download');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle image upload from device
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Add image to current slide
      if (slides[currentSlideIndex]) {
        const newSlides = [...slides];
        const currentContent = newSlides[currentSlideIndex].content || [];
        newSlides[currentSlideIndex] = {
          ...newSlides[currentSlideIndex],
          content: [
            ...currentContent,
            {
              type: 'img',
              url: dataUrl,
              children: [{ text: '' }],
            },
          ],
        };
        setSlides(newSlides);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      resetForNewGeneration();
      setStep('ready');
      setLocalSettings({
        title: '',
        theme: 'mystique',
        numSlides: 7,
        style: 'professional',
        contentStyle: 'balanced',
        outline: [],
      });
      setError(null);
      setCurrentSlideIndex(0);
      setRawSlideData('');
    }
  }, [isOpen, resetForNewGeneration, setCurrentSlideIndex]);

  if (!isOpen) return null;

  const currentTheme = themes[localSettings.theme];
  const themeColors = localSettings.theme === 'gammaDark'
    ? currentTheme.colors.dark
    : currentTheme.colors.light;

  const getSlideTitle = (slide: PlateSlide): string => {
    const heading = (slide.content as any[])?.find((el: any) => el.type === 'h1' || el.type === 'h2');
    return heading?.children?.[0]?.text || 'Untitled';
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="fixed inset-4 z-50 flex flex-col bg-background rounded-lg shadow-lg border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `${themeColors.primary}20` }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeColors.primary }}>
                <Presentation className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold">{localSettings.title || 'Create Presentation'}</h2>
              {step !== 'ready' && step !== 'configure-basics' && (
                <Badge variant="outline" style={{ borderColor: themeColors.primary, color: themeColors.primary }}>
                  <Palette className="h-3 w-3 mr-1" />
                  {currentTheme.name}
                </Badge>
              )}
              {(step === 'generating-outline' || step === 'generating-slides') && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {statusMessage || 'Processing...'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step === 'editing' && slides.length > 0 && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <Button onClick={() => setIsGridView(!isGridView)} variant="outline" size="sm">
                    {isGridView ? <Edit3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  </Button>
                  <Button onClick={savePresentation} disabled={isSaving} variant="outline" size="sm">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
                      saveSuccess ? <Check className="h-4 w-4 mr-2 text-green-500" /> :
                        <Save className="h-4 w-4 mr-2" />}
                    {saveSuccess ? 'Saved!' : 'Save'}
                  </Button>
                  <Button onClick={downloadPresentation} variant="outline" size="sm" disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    PPTX
                  </Button>
                </>
              )}
              <Button onClick={onClose} variant="ghost" size="icon"><X className="h-5 w-5" /></Button>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <div className="flex-1 overflow-auto p-6">

            {/* STEP: Ready */}
            {step === 'ready' && (
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <Sparkles className="h-16 w-16 mx-auto" style={{ color: themeColors.primary }} />
                <h3 className="text-2xl font-semibold">AI Presentation Generator</h3>
                <p className="text-muted-foreground">Create stunning presentations from your meeting content</p>

                <div className="bg-muted/50 rounded-lg p-6">
                  <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <span>Transcript: {transcript ? `${transcript.split(/\s+/).length} words` : 'None'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      <span>Q&A: {aiResponses.length} items</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep('configure-basics')}
                  disabled={!transcript && aiResponses.length === 0}
                  size="lg"
                  className="w-full max-w-md"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Get Started
                </Button>
              </div>
            )}

            {/* STEP: Configure Basics */}
            {step === 'configure-basics' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold">Configure Your Presentation</h3>
                  <p className="text-muted-foreground">Choose theme, style, and number of slides</p>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Title (optional - AI will suggest)</label>
                  <Input
                    value={localSettings.title}
                    onChange={(e) => setLocalSettings(p => ({ ...p, title: e.target.value }))}
                    placeholder="Leave empty for AI suggestion"
                    className="max-w-md"
                  />
                </div>

                {/* Number of Slides */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Number of Slides: {localSettings.numSlides}</label>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={localSettings.numSlides}
                    onChange={(e) => setLocalSettings(p => ({ ...p, numSlides: parseInt(e.target.value) }))}
                    className="w-full max-w-md"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground max-w-md">
                    <span>3 slides</span>
                    <span>15 slides</span>
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Choose Theme</label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {THEME_LIST.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setLocalSettings(p => ({ ...p, theme: t.id }))}
                        className={`p-3 rounded-lg border-2 transition-all ${localSettings.theme === t.id ? 'ring-2 ring-offset-2' : 'hover:border-gray-300'}`}
                        style={{
                          borderColor: localSettings.theme === t.id ? t.primary : '#e5e7eb',
                          ...(localSettings.theme === t.id ? { '--tw-ring-color': t.primary } as any : {})
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primary }} />
                          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.bg }} />
                        </div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Style */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Content Style</label>
                  <div className="grid grid-cols-3 gap-3 max-w-lg">
                    {CONTENT_STYLES.map((cs) => (
                      <button
                        key={cs.id}
                        onClick={() => setLocalSettings(p => ({ ...p, contentStyle: cs.id }))}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${localSettings.contentStyle === cs.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}
                        style={{ borderColor: localSettings.contentStyle === cs.id ? themeColors.primary : '#e5e7eb' }}
                      >
                        <cs.icon className="h-6 w-6 mb-2" style={{ color: localSettings.contentStyle === cs.id ? themeColors.primary : '#6b7280' }} />
                        <p className="font-medium text-sm">{cs.name}</p>
                        <p className="text-xs text-muted-foreground">{cs.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <Button onClick={() => setStep('ready')} variant="outline">Back</Button>
                  <Button onClick={generateOutline} size="lg" style={{ backgroundColor: themeColors.primary }}>
                    Generate Outline <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP: Generating Outline */}
            {step === 'generating-outline' && (
              <div className="max-w-md mx-auto text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" style={{ color: themeColors.primary }} />
                <h3 className="text-xl font-semibold">Generating Outline</h3>
                <p className="text-muted-foreground">{statusMessage || 'Analyzing your content...'}</p>
              </div>
            )}

            {/* STEP: Review Outline */}
            {step === 'review-outline' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold">Review Outline</h3>
                  <p className="text-muted-foreground">Edit topics before generating slides</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Presentation Title</label>
                  <Input
                    value={localSettings.title}
                    onChange={(e) => setLocalSettings(p => ({ ...p, title: e.target.value }))}
                    className="text-lg"
                  />
                </div>

                {/* Preview Card */}
                <div className="rounded-lg p-4 border" style={{ backgroundColor: themeColors.background, borderColor: `${themeColors.primary}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColors.primary }} />
                    <span className="text-sm font-medium" style={{ color: themeColors.text }}>{currentTheme.name} Theme</span>
                  </div>
                  <h4 className="text-lg font-semibold" style={{ color: themeColors.heading }}>{localSettings.title}</h4>
                  <p className="text-sm" style={{ color: themeColors.muted }}>{localSettings.outline.length} slides · {localSettings.contentStyle}</p>
                </div>

                {/* Outline Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Slide Topics</label>
                    <Button onClick={addOutlineItem} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {localSettings.outline.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: themeColors.primary }}>{idx + 1}</div>
                        <Input value={item} onChange={(e) => updateOutlineItem(idx, e.target.value)} className="flex-1" />
                        <Button onClick={() => removeOutlineItem(idx)} size="icon" variant="ghost" className="text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <Button onClick={() => setStep('configure-basics')} variant="outline">Back</Button>
                  <Button onClick={generateSlides} size="lg" style={{ backgroundColor: themeColors.primary }}>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Slides
                  </Button>
                </div>
              </div>
            )}

            {/* STEP: Generating Slides */}
            {step === 'generating-slides' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" style={{ color: themeColors.primary }} />
                  <h3 className="text-xl font-semibold">Creating Your Slides</h3>
                  <p className="text-muted-foreground">{statusMessage}</p>
                </div>
                {slides.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {slides.map((slide, idx) => (
                      <div key={idx} className="rounded-lg border p-4 aspect-video" style={{ backgroundColor: themeColors.background, borderColor: `${themeColors.primary}30` }}>
                        <p className="font-medium text-sm" style={{ color: themeColors.text }}>{getSlideTitle(slide)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP: Editing with Plate.js Editor */}
            {step === 'editing' && slides.length > 0 && (
              <div className="h-full flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                      disabled={currentSlideIndex === 0}
                      variant="outline"
                      size="icon"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-medium px-2">Slide {currentSlideIndex + 1} / {slides.length}</span>
                    <Button
                      onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                      disabled={currentSlideIndex === slides.length - 1}
                      variant="outline"
                      size="icon"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={addSlide} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Slide
                    </Button>
                    <Button onClick={() => setStep('review-outline')} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
                    </Button>
                  </div>
                </div>

                {/* Grid View or Editor View */}
                {isGridView ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-auto">
                    {slides.map((slide, idx) => (
                      <div
                        key={slide.id}
                        onClick={() => { setCurrentSlideIndex(idx); setIsGridView(false); }}
                        className={`relative group rounded-lg border p-4 aspect-video cursor-pointer transition-all hover:ring-2 ${idx === currentSlideIndex ? 'ring-2' : ''}`}
                        style={{
                          backgroundColor: themeColors.background,
                          borderColor: idx === currentSlideIndex ? themeColors.primary : '#e5e7eb',
                          '--tw-ring-color': themeColors.primary
                        } as any}
                      >
                        <p className="font-medium text-sm" style={{ color: themeColors.heading }}>{getSlideTitle(slide)}</p>
                        <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
                          {(slide.content as any[])?.length || 0} elements
                        </p>
                        {slides.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSlide(idx); }}
                            className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex gap-4 min-h-0">
                    {/* Slide Thumbnails */}
                    <div className="w-48 shrink-0 overflow-y-auto space-y-2 pr-2">
                      {slides.map((slide, idx) => (
                        <div
                          key={slide.id}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`relative group rounded-lg border p-3 cursor-pointer transition-all ${idx === currentSlideIndex ? 'ring-2' : 'hover:border-gray-300'}`}
                          style={{
                            backgroundColor: themeColors.background,
                            borderColor: idx === currentSlideIndex ? themeColors.primary : '#e5e7eb',
                            '--tw-ring-color': themeColors.primary
                          } as any}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: themeColors.muted }}>{idx + 1}</span>
                            <p className="text-xs truncate flex-1" style={{ color: themeColors.text }}>{getSlideTitle(slide)}</p>
                          </div>
                          {slides.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeSlide(idx); }}
                              className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Main Plate.js Editor */}
                    <div
                      className="flex-1 rounded-lg overflow-hidden min-h-[500px]"
                      style={{ backgroundColor: themeColors.background }}
                    >
                      <React.Suspense fallback={
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-8 w-8 animate-spin" style={{ color: themeColors.primary }} />
                        </div>
                      }>
                        <PlateEditor
                          key={slides[currentSlideIndex]?.id}
                          initialContent={slides[currentSlideIndex]}
                          slideIndex={currentSlideIndex}
                          isGenerating={isGeneratingPresentation}
                          readOnly={false}
                          isPreview={false}
                        />
                      </React.Suspense>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default PresentationEditor;
