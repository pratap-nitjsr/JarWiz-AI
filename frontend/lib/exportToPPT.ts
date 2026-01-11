/**
 * PlateJS to PPTX Converter
 * Converts the parsed slide JSON to PowerPoint format using pptxgenjs
 */

import type { Slide, SlideElement, RootImage, LayoutType } from '@/types/presentation';

// Theme colors for the presentation
const THEME_COLORS = {
  primary: '3B82F6',      // Blue
  secondary: '64748B',    // Slate
  accent: '8B5CF6',       // Purple
  background: 'FFFFFF',   // White
  text: '1F2937',         // Dark gray
  heading: '111827',      // Near black
  muted: '6B7280',        // Gray
};

// Slide dimensions (16:9 ratio in inches)
const SLIDE_WIDTH = 13.33;
const SLIDE_HEIGHT = 7.5;

// Layout configurations
interface LayoutConfig {
  imageX: number;
  imageW: number;
  imageH?: number;
  contentX?: number;
  contentW?: number;
  contentY?: number;
}

const LAYOUTS: Record<LayoutType | 'background', LayoutConfig> = {
  left: { imageX: 0.5, imageW: 5, contentX: 6, contentW: 6.5 },
  right: { imageX: 7.5, imageW: 5, contentX: 0.5, contentW: 6.5 },
  vertical: { imageX: 0.5, imageW: 12.33, imageH: 3.5, contentY: 4 },
  background: { imageX: 0, imageW: SLIDE_WIDTH, imageH: SLIDE_HEIGHT },
};

interface PPTXOptions {
  title: string;
  author?: string;
  company?: string;
  theme?: typeof THEME_COLORS;
}

/**
 * Export presentation to PPTX format
 * This returns the data needed for download
 */
export async function exportToPPTX(
  slides: Slide[],
  options: PPTXOptions
): Promise<Blob> {
  // Dynamically import pptxgenjs (client-side only)
  const PptxGenJS = (await import('pptxgenjs')).default;
  
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = options.author || 'JarWiz AI';
  pptx.company = options.company || 'JarWiz';
  pptx.title = options.title;
  pptx.subject = 'AI Generated Presentation';
  
  // Set slide size to 16:9
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
  pptx.layout = 'LAYOUT_16x9';
  
  const theme = options.theme || THEME_COLORS;
  
  // Process each slide
  for (let i = 0; i < slides.length; i++) {
    const slideData = slides[i];
    const pptxSlide = pptx.addSlide();
    
    // Set background color
    if (slideData.bgColor) {
      pptxSlide.background = { color: slideData.bgColor.replace('#', '') };
    } else {
      pptxSlide.background = { color: theme.background };
    }
    
    // Get layout configuration
    const layout = slideData.layoutType || 'vertical';
    const layoutConfig = LAYOUTS[layout];
    
    // Add root image if present
    if (slideData.rootImage?.url) {
      await addImage(pptxSlide, slideData.rootImage, layout, layoutConfig);
    }
    
    // Calculate content area based on layout
    let contentX = 0.5;
    let contentY = 0.5;
    let contentW = SLIDE_WIDTH - 1;
    
    if (layout === 'left' && slideData.rootImage?.url) {
      contentX = layoutConfig.contentX ?? 6;
      contentW = layoutConfig.contentW ?? 6.5;
    } else if (layout === 'right' && slideData.rootImage?.url) {
      contentX = layoutConfig.contentX ?? 0.5;
      contentW = layoutConfig.contentW ?? 6.5;
    } else if (layout === 'vertical' && slideData.rootImage?.url) {
      contentY = layoutConfig.contentY ?? 4;
    }
    
    // Process slide elements
    let currentY = contentY;
    for (const element of slideData.content) {
      currentY = await addElement(pptxSlide, element, contentX, currentY, contentW, theme);
    }
    
    // Add slide number
    pptxSlide.addText(`${i + 1}`, {
      x: SLIDE_WIDTH - 0.5,
      y: SLIDE_HEIGHT - 0.4,
      w: 0.3,
      h: 0.3,
      fontSize: 10,
      color: theme.muted,
      align: 'right',
    });
  }
  
  // Generate and return blob
  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return blob;
}

/**
 * Add an image to the slide
 */
async function addImage(
  slide: any,
  rootImage: RootImage,
  layout: LayoutType,
  layoutConfig: any
): Promise<void> {
  if (!rootImage.url) return;
  
  const imageOpts: any = {
    path: rootImage.url,
    sizing: { type: 'cover', w: layoutConfig.imageW, h: layoutConfig.imageH || SLIDE_HEIGHT - 1 },
  };
  
  if (layout === 'left') {
    imageOpts.x = layoutConfig.imageX;
    imageOpts.y = 0.5;
    imageOpts.w = layoutConfig.imageW;
    imageOpts.h = SLIDE_HEIGHT - 1;
  } else if (layout === 'right') {
    imageOpts.x = layoutConfig.imageX;
    imageOpts.y = 0.5;
    imageOpts.w = layoutConfig.imageW;
    imageOpts.h = SLIDE_HEIGHT - 1;
  } else if (layout === 'vertical') {
    imageOpts.x = layoutConfig.imageX;
    imageOpts.y = 0.5;
    imageOpts.w = layoutConfig.imageW;
    imageOpts.h = layoutConfig.imageH;
  } else if (layout === 'background') {
    imageOpts.x = 0;
    imageOpts.y = 0;
    imageOpts.w = SLIDE_WIDTH;
    imageOpts.h = SLIDE_HEIGHT;
  }
  
  try {
    slide.addImage(imageOpts);
  } catch (error) {
    console.error('Error adding image:', error);
  }
}

/**
 * Add an element to the slide
 */
async function addElement(
  slide: any,
  element: SlideElement,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): Promise<number> {
  const type = element.type;
  
  switch (type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return addHeading(slide, element, x, y, w, theme);
    
    case 'p':
      return addParagraph(slide, element, x, y, w, theme);
    
    case 'bullets':
      return addBullets(slide, element, x, y, w, theme);
    
    case 'icons':
      return addIcons(slide, element, x, y, w, theme);
    
    case 'timeline':
      return addTimeline(slide, element, x, y, w, theme);
    
    case 'arrows':
      return addArrows(slide, element, x, y, w, theme);
    
    case 'boxes':
      return addBoxes(slide, element, x, y, w, theme);
    
    case 'compare':
      return addCompare(slide, element, x, y, w, theme);
    
    case 'pyramid':
      return addPyramid(slide, element, x, y, w, theme);
    
    case 'cycle':
      return addCycle(slide, element, x, y, w, theme);
    
    default:
      // Try to extract text from unknown elements
      const text = extractText(element);
      if (text) {
        slide.addText(text, {
          x, y, w, h: 0.5,
          fontSize: 14,
          color: theme.text,
        });
        return y + 0.6;
      }
      return y;
  }
}

/**
 * Add heading element
 */
function addHeading(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const text = extractText(element);
  const type = element.type;
  
  const fontSizes: Record<string, number> = {
    h1: 36,
    h2: 28,
    h3: 24,
    h4: 20,
    h5: 18,
    h6: 16,
  };
  
  const fontSize = fontSizes[type] || 24;
  const height = fontSize / 72 + 0.3;
  
  slide.addText(text, {
    x, y, w, h: height,
    fontSize,
    color: theme.heading,
    bold: true,
    valign: 'top',
  });
  
  return y + height + 0.2;
}

/**
 * Add paragraph element
 */
function addParagraph(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const text = extractText(element);
  
  slide.addText(text, {
    x, y, w, h: 0.8,
    fontSize: 14,
    color: theme.text,
    valign: 'top',
  });
  
  return y + 0.9;
}

/**
 * Add bullet list
 */
function addBullets(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  let currentY = y;
  
  for (const item of items) {
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    if (heading) {
      slide.addText(heading, {
        x, y: currentY, w, h: 0.4,
        fontSize: 16,
        color: theme.heading,
        bold: true,
      });
      currentY += 0.4;
    }
    
    if (text && text !== heading) {
      slide.addText(text, {
        x: x + 0.3, y: currentY, w: w - 0.3, h: 0.5,
        fontSize: 14,
        color: theme.text,
        bullet: { type: 'bullet' },
      });
      currentY += 0.5;
    }
  }
  
  return currentY + 0.3;
}

/**
 * Add icons layout
 */
function addIcons(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const itemCount = items.length;
  const itemWidth = w / Math.min(itemCount, 4);
  
  let currentX = x;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    // Add icon placeholder (circle)
    slide.addShape('ellipse', {
      x: currentX + itemWidth / 2 - 0.3,
      y: y,
      w: 0.6,
      h: 0.6,
      fill: { color: theme.primary },
    });
    
    // Add heading
    if (heading) {
      slide.addText(heading, {
        x: currentX, y: y + 0.7, w: itemWidth, h: 0.4,
        fontSize: 14,
        color: theme.heading,
        bold: true,
        align: 'center',
      });
    }
    
    // Add description
    if (text && text !== heading) {
      slide.addText(text, {
        x: currentX, y: y + 1.1, w: itemWidth, h: 0.6,
        fontSize: 12,
        color: theme.text,
        align: 'center',
      });
    }
    
    currentX += itemWidth;
    if ((i + 1) % 4 === 0) {
      currentX = x;
    }
  }
  
  return y + 2;
}

/**
 * Add timeline layout
 */
function addTimeline(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const itemWidth = w / items.length;
  
  // Draw timeline line
  slide.addShape('rect', {
    x, y: y + 0.3, w, h: 0.05,
    fill: { color: theme.primary },
  });
  
  let currentX = x;
  
  for (const item of items) {
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    // Add timeline dot
    slide.addShape('ellipse', {
      x: currentX + itemWidth / 2 - 0.15,
      y: y + 0.175,
      w: 0.3,
      h: 0.3,
      fill: { color: theme.primary },
    });
    
    // Add heading
    if (heading) {
      slide.addText(heading, {
        x: currentX, y: y + 0.6, w: itemWidth, h: 0.4,
        fontSize: 14,
        color: theme.heading,
        bold: true,
        align: 'center',
      });
    }
    
    // Add description
    if (text && text !== heading) {
      slide.addText(text, {
        x: currentX, y: y + 1, w: itemWidth, h: 0.6,
        fontSize: 12,
        color: theme.text,
        align: 'center',
      });
    }
    
    currentX += itemWidth;
  }
  
  return y + 2;
}

/**
 * Add arrows flow layout
 */
function addArrows(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const itemWidth = (w - (items.length - 1) * 0.3) / items.length;
  
  let currentX = x;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    // Add box
    slide.addShape('rect', {
      x: currentX, y, w: itemWidth, h: 1.2,
      fill: { color: theme.primary },
      line: { color: theme.primary },
    });
    
    // Add heading
    if (heading) {
      slide.addText(heading, {
        x: currentX, y: y + 0.1, w: itemWidth, h: 0.4,
        fontSize: 14,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
      });
    }
    
    // Add description
    if (text && text !== heading) {
      slide.addText(text, {
        x: currentX, y: y + 0.5, w: itemWidth, h: 0.6,
        fontSize: 11,
        color: 'FFFFFF',
        align: 'center',
      });
    }
    
    // Add arrow between items
    if (i < items.length - 1) {
      slide.addText('→', {
        x: currentX + itemWidth, y: y + 0.4, w: 0.3, h: 0.4,
        fontSize: 24,
        color: theme.primary,
        align: 'center',
      });
    }
    
    currentX += itemWidth + 0.3;
  }
  
  return y + 1.5;
}

/**
 * Add boxes layout
 */
function addBoxes(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const cols = Math.min(items.length, 3);
  const itemWidth = (w - (cols - 1) * 0.2) / cols;
  
  let currentX = x;
  let currentY = y;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    // Add box
    slide.addShape('roundRect', {
      x: currentX, y: currentY, w: itemWidth, h: 1.2,
      fill: { color: 'F3F4F6' },
      line: { color: theme.secondary, pt: 1 },
    });
    
    // Add heading
    if (heading) {
      slide.addText(heading, {
        x: currentX, y: currentY + 0.2, w: itemWidth, h: 0.4,
        fontSize: 14,
        color: theme.heading,
        bold: true,
        align: 'center',
      });
    }
    
    // Add description
    if (text && text !== heading) {
      slide.addText(text, {
        x: currentX, y: currentY + 0.6, w: itemWidth, h: 0.5,
        fontSize: 12,
        color: theme.text,
        align: 'center',
      });
    }
    
    currentX += itemWidth + 0.2;
    if ((i + 1) % cols === 0) {
      currentX = x;
      currentY += 1.4;
    }
  }
  
  return currentY + 1.4;
}

/**
 * Add compare layout (two columns)
 */
function addCompare(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const colWidth = (w - 0.3) / 2;
  
  for (let i = 0; i < Math.min(items.length, 2); i++) {
    const item = items[i];
    const text = extractText(item);
    const heading = extractChildHeading(item);
    const colX = x + i * (colWidth + 0.3);
    
    // Add header
    slide.addShape('rect', {
      x: colX, y, w: colWidth, h: 0.5,
      fill: { color: i === 0 ? theme.primary : theme.accent },
    });
    
    if (heading) {
      slide.addText(heading, {
        x: colX, y, w: colWidth, h: 0.5,
        fontSize: 14,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }
    
    // Add content
    if (text && text !== heading) {
      slide.addText(text, {
        x: colX, y: y + 0.6, w: colWidth, h: 1.5,
        fontSize: 12,
        color: theme.text,
        valign: 'top',
      });
    }
  }
  
  return y + 2.2;
}

/**
 * Add pyramid layout
 */
function addPyramid(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const itemHeight = 0.8;
  const totalHeight = items.length * itemHeight;
  
  let currentY = y;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    // Calculate width based on pyramid level (wider at bottom)
    const levelWidth = ((items.length - i) / items.length) * w * 0.8;
    const levelX = x + (w - levelWidth) / 2;
    
    // Add trapezoid shape (approximated with rectangle)
    slide.addShape('rect', {
      x: levelX, y: currentY, w: levelWidth, h: itemHeight - 0.1,
      fill: { color: theme.primary },
    });
    
    // Add text
    const displayText = heading || text;
    if (displayText) {
      slide.addText(displayText, {
        x: levelX, y: currentY, w: levelWidth, h: itemHeight - 0.1,
        fontSize: 12,
        color: 'FFFFFF',
        bold: !!heading,
        align: 'center',
        valign: 'middle',
      });
    }
    
    currentY += itemHeight;
  }
  
  return currentY + 0.3;
}

/**
 * Add cycle layout
 */
function addCycle(
  slide: any,
  element: any,
  x: number,
  y: number,
  w: number,
  theme: typeof THEME_COLORS
): number {
  const items = element.children || [];
  const centerX = x + w / 2;
  const centerY = y + 1.2;
  const radius = 1;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = extractText(item);
    const heading = extractChildHeading(item);
    
    // Calculate position on circle
    const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2;
    const itemX = centerX + Math.cos(angle) * radius - 0.4;
    const itemY = centerY + Math.sin(angle) * radius - 0.3;
    
    // Add circle
    slide.addShape('ellipse', {
      x: itemX, y: itemY, w: 0.8, h: 0.6,
      fill: { color: theme.primary },
    });
    
    // Add text
    const displayText = heading || text;
    if (displayText) {
      slide.addText(displayText.substring(0, 20), {
        x: itemX, y: itemY, w: 0.8, h: 0.6,
        fontSize: 10,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      });
    }
  }
  
  return y + 2.8;
}

/**
 * Extract text from element children
 */
function extractText(element: any): string {
  if (!element) return '';
  
  if (typeof element === 'string') return element;
  
  if (element.text) return element.text;
  
  if (element.children && Array.isArray(element.children)) {
    return element.children
      .map((child: any) => extractText(child))
      .filter(Boolean)
      .join(' ');
  }
  
  return '';
}

/**
 * Extract heading from element children
 */
function extractChildHeading(element: any): string | null {
  if (!element?.children) return null;
  
  for (const child of element.children) {
    if (child.type && child.type.startsWith('h')) {
      return extractText(child);
    }
  }
  
  return null;
}

/**
 * Download the presentation as PPTX
 */
export async function downloadPPTX(
  slides: Slide[],
  filename: string,
  options?: Partial<PPTXOptions>
): Promise<void> {
  const blob = await exportToPPTX(slides, {
    title: filename,
    ...options,
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\s+/g, '_')}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
