// Presentation Types

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ImageCropSettings {
  objectFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition: {
    x: number;
    y: number;
  };
}

export type LayoutType = 'left' | 'right' | 'vertical' | 'background';

export interface RootImage {
  query: string;
  url?: string;
  cropSettings?: ImageCropSettings;
  layoutType?: LayoutType;
  size?: { w?: string; h?: number };
}

// Slide content types
export interface TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: number | string;
  color?: string;
  backgroundColor?: string;
}

export interface HeadingElement {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: (TextNode | any)[];
}

export interface ParagraphElement {
  type: 'p';
  children: (TextNode | any)[];
  indent?: number;
  listStyleType?: string;
}

export interface ImageElement {
  type: 'img';
  url?: string;
  query?: string;
  children: TextNode[];
}

// Component types
export interface BulletItem {
  type: 'bullet';
  children: any[];
}

export interface BulletGroup {
  type: 'bullets';
  children: BulletItem[];
}

export interface IconItem {
  type: 'icon-item';
  children: any[];
}

export interface IconList {
  type: 'icons';
  children: IconItem[];
}

export interface TimelineItem {
  type: 'timeline-item';
  children: any[];
}

export interface TimelineGroup {
  type: 'timeline';
  children: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  sidedness?: 'single' | 'double';
}

export interface ArrowItem {
  type: 'arrow-item';
  children: any[];
}

export interface ArrowList {
  type: 'arrows';
  children: ArrowItem[];
}

export interface PyramidItem {
  type: 'pyramid-item';
  children: any[];
}

export interface PyramidGroup {
  type: 'pyramid';
  children: PyramidItem[];
}

export interface CycleItem {
  type: 'cycle-item';
  children: any[];
}

export interface CycleGroup {
  type: 'cycle';
  children: CycleItem[];
}

export interface StairItem {
  type: 'stair-item';
  children: any[];
}

export interface StairGroup {
  type: 'staircase';
  children: StairItem[];
}

export interface BoxItem {
  type: 'box-item';
  children: any[];
}

export interface BoxGroup {
  type: 'boxes';
  children: BoxItem[];
}

export interface CompareGroup {
  type: 'compare';
  children: any[];
}

export interface BeforeAfterGroup {
  type: 'before-after';
  children: any[];
}

export interface ProsConsGroup {
  type: 'pros-cons';
  children: any[];
}

export interface TableElement {
  type: 'table';
  children: any[];
}

export interface ChartElement {
  type: 'bar-chart' | 'pie-chart' | 'line-chart' | 'area-chart' | 'radar-chart' | 'scatter-chart';
  data: any[];
  children: TextNode[];
}

// Union type for all slide elements
export type SlideElement = 
  | HeadingElement
  | ParagraphElement
  | ImageElement
  | BulletGroup
  | IconList
  | TimelineGroup
  | ArrowList
  | PyramidGroup
  | CycleGroup
  | StairGroup
  | BoxGroup
  | CompareGroup
  | BeforeAfterGroup
  | ProsConsGroup
  | TableElement
  | ChartElement
  | any;

// Main Slide type
export interface Slide {
  id: string;
  content: SlideElement[];
  rootImage?: RootImage;
  layoutType?: LayoutType;
  alignment?: 'start' | 'center' | 'end';
  bgColor?: string;
  width?: 'S' | 'M' | 'L';
}

// Presentation request/response types
export interface PresentationOutlineRequest {
  prompt: string;
  numberOfCards: number;
  context?: string; // Meeting transcript + chat history
}

export interface PresentationGenerateRequest {
  title: string;
  prompt: string;
  outline: string[];
  context?: string;
}

export interface PresentationResponse {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: string;
  cloudinaryUrl?: string;
}

// Theme colors for export
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  heading: string;
  muted: string;
}
