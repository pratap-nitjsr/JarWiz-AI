import {
  type TColumnElement,
  type TColumnGroupElement,
  type TElement,
} from "platejs";
import PptxGenJS from "pptxgenjs";
import {
  type TArrowListElement,
  type TArrowListItemElement,
} from "../editor/plugins/arrow-plugin";
import {
  type TBulletGroupElement,
  type TBulletItemElement,
} from "../editor/plugins/bullet-plugin";
import {
  type TCycleGroupElement,
  type TCycleItemElement,
} from "../editor/plugins/cycle-plugin";
import {
  type TIconListElement,
  type TIconListItemElement,
} from "../editor/plugins/icon-list-plugin";
import {
  type TVisualizationListElement,
  type TVisualizationListItemElement,
} from "../editor/plugins/legacy/visualization-list-plugin";
import {
  type TPyramidGroupElement,
  type TPyramidItemElement,
} from "../editor/plugins/pyramid-plugin";
import {
  type TStairGroupElement,
  type TStairItemElement,
} from "../editor/plugins/staircase-plugin";
import {
  type TTimelineGroupElement,
  type TTimelineItemElement,
} from "../editor/plugins/timeline-plugin";
import { type PlateNode, type PlateSlide } from "./parser";
import {
  type HeadingElement,
  type ImageElement,
  type ParagraphElement,
} from "./types";

// Type guards for text nodes
interface TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  generating?: boolean;
  // Optional marks from font plugins
  fontFamily?: string;
  fontSize?: number | string;
  color?: string;
  backgroundColor?: string;
}

interface ImageCropSettings {
  objectFit: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition: {
    x: number;
    y: number;
  };
}

interface RootImage {
  url?: string;
  query: string;
  cropSettings?: ImageCropSettings;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  heading: string;
  muted: string;
}

interface PresentationData {
  slides: PlateSlide[];
}

export class PlateJSToPPTXConverter {
  private pptx: PptxGenJS;
  private currentSlide: PptxGenJS.Slide | null = null;

  // Layout constants
  private readonly SLIDE_WIDTH = 10;
  private readonly SLIDE_HEIGHT = 5.625;
  private readonly MARGIN = 0.5;

  // Theme defaults (mirror src/styles/presentation.css light variables)
  private THEME: ThemeColors = {
    primary: "3B82F6",
    secondary: "1F2937",
    accent: "60A5FA",
    background: "FFFFFF",
    text: "1F2937",
    heading: "111827",
    muted: "6B7280",
  };

  // SVG definitions from the PlateJS components
  private readonly SVG_DEFINITIONS = {
    arrow: {
      path: "M0,90L45,108L90,90L90,0L45,18L0,0Z",
      viewBox: "0 0 90 108",
      width: 90,
      height: 108,
    },
    cycle: {
      paths: [
        "M23.25569,25.04785,28.119,36.65509A25.64562,25.64562,0,0,1,49.3597,24.379l7.62158-10.01624L49.384,4.37842A45.65079,45.65079,0,0,0,10.81752,26.63416Z",
        "M89.82619,27.75232,84.98225,39.31543,72.50014,37.72351a25.59208,25.59208,0,0,1,.01,24.536l4.86279,11.60571,12.43573-1.58667a45.49257,45.49257,0,0,0,.01758-44.52624Z",
        "M58.23714,14.36279,50.61586,24.37842A25.64474,25.64474,0,0,1,71.86818,36.635l12.48517,1.59253L89.199,26.66272A45.65056,45.65056,0,0,0,50.64009,4.379Z",
        "M76.744,74.95312,71.88106,63.34521A25.64518,25.64518,0,0,1,50.64033,75.62146L43.01839,85.6377,50.616,95.62207a45.65067,45.65067,0,0,0,38.5661-22.25525Z",
        "M15.01839,60.68555,27.50026,62.2774a25.59173,25.59173,0,0,1-.01013-24.53686l-4.86335-11.6048L10.19136,27.72192a45.49238,45.49238,0,0,0-.01764,44.52582Z",
        "M41.76253,85.6377l7.62164-10.01563A25.6444,25.6444,0,0,1,28.13258,63.36646l-12.48529-1.593L10.801,73.33752a45.65051,45.65051,0,0,0,38.5589,22.28394Z",
      ],
      viewBox: "0 0 100 125",
      width: 100,
      height: 125,
    },
  };

  constructor(theme?: Partial<ThemeColors>) {
    this.pptx = new PptxGenJS();
    this.setupPresentation();
    if (theme) this.applyTheme(theme);
  }

  private setupPresentation() {
    this.pptx.layout = "LAYOUT_16x9";
    this.pptx.theme = {
      headFontFace: "Inter",
      bodyFontFace: "Inter",
    };
  }

  private applyTheme(theme: Partial<ThemeColors>) {
    this.THEME = { ...this.THEME, ...theme };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace("#", "");
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return null;
    const num = parseInt(clean, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  private isLightColor(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;
    // Perceived luminance
    const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    return lum > 186; // common threshold
  }

  public async convertToPPTX(
    presentationData: PresentationData,
  ): Promise<PptxGenJS> {
    for (const slide of presentationData.slides) {
      await this.processSlide(slide);
    }
    return this.pptx;
  }

  private async processSlide(slide: PlateSlide) {
    this.currentSlide = this.pptx.addSlide();

    // Add root image first (no margins/padding as requested)
    if (slide.rootImage) {
      await this.addRootImage(slide.rootImage, slide.layoutType);
    }

    // Calculate content area based on layout
    const contentArea = this.calculateContentArea(slide);

    // Process slide content
    await this.processElements(slide.content, contentArea, slide.alignment);
  }

  private calculateContentArea(slide: PlateSlide): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const baseArea = {
      x: this.MARGIN,
      y: this.MARGIN,
      w: this.SLIDE_WIDTH - this.MARGIN * 2,
      h: this.SLIDE_HEIGHT - this.MARGIN * 2,
    };

    if (!slide.rootImage || !slide.layoutType) {
      return baseArea;
    }

    switch (slide.layoutType) {
      case "left":
        return {
          x: baseArea.x + baseArea.w * 0.45,
          y: baseArea.y,
          w: baseArea.w * 0.55,
          h: baseArea.h,
        };
      case "right":
        return {
          x: baseArea.x,
          y: baseArea.y,
          w: baseArea.w * 0.55,
          h: baseArea.h,
        };
      case "vertical":
        return {
          x: baseArea.x,
          y: baseArea.y + baseArea.h * 0.4,
          w: baseArea.w,
          h: baseArea.h * 0.6,
        };
      default:
        return baseArea;
    }
  }

  private async addRootImage(rootImage: RootImage, layoutType?: string) {
    if (!this.currentSlide) return;
    if (!rootImage.url) return;

    const imagePath = rootImage.url as string;

    let imageOptions: PptxGenJS.ImageProps = {
      path: imagePath,
      x: 0, // No margins as requested
      y: 0, // No padding as requested
      w: this.SLIDE_WIDTH,
      h: this.SLIDE_HEIGHT,
    };

    // Adjust image position based on layout
    switch (layoutType) {
      case "left":
        imageOptions = {
          ...imageOptions,
          w: this.SLIDE_WIDTH * 0.45,
          h: this.SLIDE_HEIGHT,
        };
        break;
      case "right":
        imageOptions = {
          ...imageOptions,
          x: this.SLIDE_WIDTH * 0.55,
          w: this.SLIDE_WIDTH * 0.45,
          h: this.SLIDE_HEIGHT,
        };
        break;
      case "vertical":
        imageOptions = {
          ...imageOptions,
          y: 0,
          w: this.SLIDE_WIDTH,
          h: this.SLIDE_HEIGHT * 0.4,
        };
        break;
    }

    // Apply sizing based on objectFit setting
    // Default behavior: object-fit "cover" with centered object-position if no cropSettings
    const cropSettings = rootImage.cropSettings;
    const objectFit = cropSettings?.objectFit || "cover";
    const objectPosition = cropSettings?.objectPosition || { x: 0.5, y: 0.5 };

    // Apply sizing according to official PptxGenJS documentation
    if (
      typeof imageOptions.w === "number" &&
      typeof imageOptions.h === "number"
    ) {
      switch (objectFit) {
        case "contain":
          // contain: shrinks image to fit completely within area, preserving ratio
          imageOptions.sizing = {
            type: "contain",
            w: imageOptions.w,
            h: imageOptions.h,
          };
          break;
        case "cover":
          // cover: shrinks image to completely fill area, crops excess, preserving ratio
          imageOptions.sizing = {
            type: "cover",
            w: imageOptions.w,
            h: imageOptions.h,
          };
          break;
        case "fill":
          // fill: no sizing property = default stretch behavior
          break;
        default:
          // Use crop with positioning offsets
          imageOptions.sizing = {
            type: "crop",
            w: imageOptions.w,
            h: imageOptions.h,
            // x, y are positions relative to the source image for cropping
            x: objectPosition.x * imageOptions.w * 0.1, // Adjust multiplier as needed
            y: objectPosition.y * imageOptions.h * 0.1, // Adjust multiplier as needed
          };
          break;
      }
    }

    try {
      this.currentSlide.addImage(imageOptions);
    } catch (error) {
      console.warn("Failed to add root image:", error);
    }
  }

  private async processElements(
    elements: PlateNode[],
    area: { x: number; y: number; w: number; h: number },
    alignment?: "start" | "center" | "end",
  ) {
    // Measure total height first to position the block (slide-level alignment)
    const totalHeight = await this.measureElements(elements, area.w);

    // Determine starting Y based on slide alignment (center entire block)
    let startY = area.y;
    if (alignment === "center") {
      startY = area.y + Math.max(0, (area.h - totalHeight) / 2);
    } else if (alignment === "end") {
      startY = area.y + Math.max(0, area.h - totalHeight);
    }

    let currentY = startY;
    for (const element of elements) {
      const elementHeight = await this.processElement(
        element,
        area.x,
        currentY,
        area.w,
        false,
      );
      currentY += elementHeight;

      if (currentY >= area.y + area.h) break;
    }
  }

  private async processElement(
    element: PlateNode,
    x: number,
    y: number,
    width: number,
    measureOnly: boolean = false,
  ): Promise<number> {
    if (!this.currentSlide) return 0;

    const elementType = (element as TElement).type;

    switch (elementType) {
      case "h1":
        return this.addHeading(
          element as HeadingElement,
          x,
          y,
          width,
          32,
          measureOnly,
        );
      case "h2":
        return this.addHeading(
          element as HeadingElement,
          x,
          y,
          width,
          28,
          measureOnly,
        );
      case "h3":
        return this.addHeading(
          element as HeadingElement,
          x,
          y,
          width,
          24,
          measureOnly,
        );
      case "h4":
        return this.addHeading(
          element as HeadingElement,
          x,
          y,
          width,
          20,
          measureOnly,
        );
      case "h5":
        return this.addHeading(
          element as HeadingElement,
          x,
          y,
          width,
          18,
          measureOnly,
        );
      case "h6":
        return this.addHeading(
          element as HeadingElement,
          x,
          y,
          width,
          16,
          measureOnly,
        );
      case "p":
        return this.addParagraph(
          element as ParagraphElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "bullets":
        return await this.addBullets(
          element as TBulletGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "column_group":
        return await this.addColumns(
          element as TColumnGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "pyramid":
        return await this.addPyramid(
          element as TPyramidGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "arrows":
        return await this.addArrowVisualization(
          element as TArrowListElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "timeline":
        return await this.addTimeline(
          element as TTimelineGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "cycle":
        return await this.addCycle(
          element as TCycleGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "staircase":
        return await this.addStaircase(
          element as TStairGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "icons":
        return await this.addIcons(
          element as TIconListElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "visualization-list":
        return await this.addVisualizationList(
          element as unknown as TVisualizationListElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "image":
      case "img":
        return await this.addImage(
          element as ImageElement,
          x,
          y,
          width,
          measureOnly,
        );
      default:
        // Handle unknown elements as paragraphs
        return this.addParagraph(
          element as ParagraphElement,
          x,
          y,
          width,
          measureOnly,
        );
    }
  }

  private addHeading(
    element: HeadingElement,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    measureOnly = false,
  ): number {
    const height = Math.max(fontSize / 72 + 0.3, 0.8);
    if (measureOnly) return height;

    const runs = this.extractTextRuns(element);
    const textOptions = this.getTextOptions(element, fontSize);
    // Use accent color for headings to mimic gradient accent
    textOptions.color = this.THEME.accent;

    if (runs.length > 0) {
      const coloredRuns = runs.map((r) => ({
        text: r.text,
        options: { ...(r.options ?? {}), color: this.THEME.accent },
      }));
      this.currentSlide?.addText(coloredRuns, {
        x,
        y,
        w: width,
        h: height,
        ...textOptions,
        align: "left",
        fit: "resize",
        wrap: true,
      });
    } else {
      const text = this.extractText(element);
      this.currentSlide?.addText(text, {
        x,
        y,
        w: width,
        h: height,
        ...textOptions,
        align: "left",
        fit: "resize",
        wrap: true,
      });
    }

    return height;
  }

  private addParagraph(
    element: ParagraphElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): number {
    const text = this.extractText(element);
    if (!text.trim()) return 0.2;
    if (measureOnly) return 0.8;

    const runs = this.extractTextRuns(element);
    const textOptions = this.getTextOptions(element, 14);
    // Decide paragraph/body text color: force dark text on light backgrounds
    const darkFallback = (this.THEME.secondary || "1F2937").replace("#", "");
    const paragraphColor = this.isLightColor(this.THEME.background)
      ? darkFallback
      : this.THEME.text;
    textOptions.color = paragraphColor;

    if (runs.length > 0) {
      const coloredRuns = runs.map((r) => ({
        text: r.text,
        options: { ...(r.options ?? {}), color: paragraphColor },
      }));
      this.currentSlide?.addText(coloredRuns, {
        x,
        y,
        w: width,
        h: 0.8,
        ...textOptions,
        align: "left",
        fit: "resize",
        wrap: true,
      });
    } else {
      this.currentSlide?.addText(text, {
        x,
        y,
        w: width,
        h: 0.8,
        ...textOptions,
        align: "left",
        fit: "resize",
        wrap: true,
      });
    }

    return 0.8;
  }

  private async addBullets(
    element: TBulletGroupElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const bullets = element.children.filter(
      (child) => (child as TBulletItemElement).type === "bullet",
    );
    const columns = Math.min(
      3,
      Math.max(1, bullets.length <= 2 ? bullets.length : 3),
    );
    const columnWidth = width / columns;
    const gap = 0.2;

    let maxHeight = 0;

    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i] as TBulletItemElement;
      const columnIndex = i % columns;
      const rowIndex = Math.floor(i / columns);

      const bulletX = x + columnIndex * (columnWidth + gap);
      const bulletY = y + rowIndex * 1.5;

      if (!measureOnly) {
        // Add bullet number box
        this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
          x: bulletX,
          y: bulletY,
          w: 0.4,
          h: 0.4,
          fill: { color: this.THEME.primary },
          line: { width: 0 },
        });

        // Add bullet number
        this.currentSlide?.addText((i + 1).toString(), {
          x: bulletX,
          y: bulletY,
          w: 0.4,
          h: 0.4,
          fontSize: 12,
          bold: true,
          color: "FFFFFF",
          align: "center",
          valign: "middle",
        });

        // Add bullet content
        const bulletRuns = this.extractTextRuns(bullet);
        const bulletText = this.extractText(bullet);
        if (bulletRuns.length > 0) {
          this.currentSlide?.addText(bulletRuns, {
            x: bulletX + 0.5,
            y: bulletY,
            w: columnWidth - 0.6,
            h: 1.2,
            fontSize: 12,
            valign: "top",
            align: "left",
            color: this.THEME.text,
          });
        } else {
          this.currentSlide?.addText(bulletText, {
            x: bulletX + 0.5,
            y: bulletY,
            w: columnWidth - 0.6,
            h: 1.2,
            fontSize: 12,
            valign: "top",
            align: "left",
            color: this.THEME.text,
          });
        }
      }

      maxHeight = Math.max(maxHeight, (rowIndex + 1) * 1.5);
    }

    return maxHeight + 0.5;
  }

  private async addColumns(
    element: TColumnGroupElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const columns = element.children.filter(
      (child) => (child as TColumnElement).type === "column",
    );
    let currentX = x;
    let maxHeight = 0;

    for (const column of columns) {
      const columnElement = column as TColumnElement;
      const columnWidth =
        width * (parseFloat(columnElement.width || "50%") / 100);

      let columnHeight = 0;
      let columnY = y;

      for (const child of columnElement.children) {
        const childHeight = await this.processElement(
          child as PlateNode,
          currentX,
          columnY,
          columnWidth - 0.1,
          measureOnly,
        );
        columnHeight += childHeight;
        columnY += childHeight;
      }

      maxHeight = Math.max(maxHeight, columnHeight);
      currentX += columnWidth;
    }

    return maxHeight;
  }

  private async addVisualizationList(
    element: TVisualizationListElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const visualizationType = element.visualizationType;

    switch (visualizationType) {
      case "pyramid":
        return await this.addPyramid(
          element as unknown as TPyramidGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "arrow":
        return await this.addArrowVisualization(
          element as unknown as TArrowListElement,
          x,
          y,
          width,
          measureOnly,
        );
      case "timeline":
        return await this.addTimeline(
          element as unknown as TTimelineGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
      default:
        return await this.addPyramid(
          element as unknown as TPyramidGroupElement,
          x,
          y,
          width,
          measureOnly,
        );
    }
  }

  private async addArrowVisualization(
    element: TArrowListElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const items = element.children.filter((child) =>
      ["arrow-item", "visualization-item"].includes(
        (child as TArrowListItemElement | TVisualizationListItemElement).type,
      ),
    );

    let currentY = y;

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as
        | TArrowListItemElement
        | TVisualizationListItemElement;

      if (!measureOnly) {
        // Create and add arrow SVG
        const arrowSvg = this.createArrowSVG(this.THEME.primary);
        await this.addSVGToSlide(arrowSvg, x + 0.5, currentY, 1, 0.6);

        // Add content
        const itemText = this.extractText(item);
        this.currentSlide?.addText(itemText, {
          x: x + 1.8,
          y: currentY,
          w: width - 2.3,
          h: 0.6,
          fontSize: 12,
          valign: "middle",
          align: "left",
          color: this.THEME.text,
        });
      }

      currentY += 0.8;
    }

    return currentY - y + 0.2;
  }

  private async addPyramid(
    element: TPyramidGroupElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const items = element.children.filter((child) =>
      ["pyramid-item", "visualization-item"].includes(
        (child as TPyramidItemElement | TVisualizationListItemElement).type,
      ),
    );

    const pyramidHeight = items.length * 0.8;
    const baseWidth = width * 0.8;
    const startX = x + (width - baseWidth) / 2;

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as
        | TPyramidItemElement
        | TVisualizationListItemElement;
      const levelWidth = (baseWidth * (i + 1)) / items.length;
      const levelX = startX + (baseWidth - levelWidth) / 2;
      const levelY = y + i * 0.8;

      // Create pyramid level shape using clip path algorithm from PyramidItem
      const increment = (baseWidth * 0.8) / (2 * items.length);
      let clipPath: string;

      if (i === 0) {
        // First layer is a triangle
        clipPath = `polygon(50% 0%, ${50 - increment}% 100%, ${50 + increment}% 100%)`;
      } else {
        // For other layers
        const prevXOffset = increment * i;
        const currentXOffset = increment * (i + 1);
        const prevBottomLeft = 50 - prevXOffset;
        const prevBottomRight = 50 + prevXOffset;
        const currentBottomLeft = 50 - currentXOffset;
        const currentBottomRight = 50 + currentXOffset;
        clipPath = `polygon(${prevBottomLeft}% 0%, ${prevBottomRight}% 0%, ${currentBottomRight}% 100%, ${currentBottomLeft}% 100%)`;
      }

      if (!measureOnly) {
        // Create SVG for pyramid level
        const pyramidSvg = this.createPyramidLevelSVG(
          levelWidth * 72,
          0.6 * 72,
          this.THEME.primary,
          clipPath,
          (i + 1).toString(),
        );
        await this.addSVGToSlide(pyramidSvg, levelX, levelY, levelWidth, 0.6);

        // Add content text
        const itemText = this.extractText(item);
        this.currentSlide?.addText(itemText, {
          x: levelX + 0.7,
          y: levelY,
          w: levelWidth - 0.8,
          h: 0.6,
          fontSize: 12,
          color: "FFFFFF",
          valign: "middle",
          align: "left",
        });
      }
    }

    return pyramidHeight + 0.5;
  }

  private async addTimeline(
    element: TTimelineGroupElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const items = element.children.filter((child) =>
      ["timeline-item", "visualization-item"].includes(
        (child as TTimelineItemElement | TVisualizationListItemElement).type,
      ),
    ) as (TTimelineItemElement | TVisualizationListItemElement)[];

    const orientation = element.orientation || "vertical";
    const sidedness = element.sidedness || "single";

    if (orientation === "vertical") {
      return await this.addVerticalTimeline(
        items,
        x,
        y,
        width,
        sidedness,
        measureOnly,
      );
    } else {
      return await this.addHorizontalTimeline(
        items,
        x,
        y,
        width,
        sidedness,
        measureOnly,
      );
    }
  }

  private async addVerticalTimeline(
    items: (TTimelineItemElement | TVisualizationListItemElement)[],
    x: number,
    y: number,
    width: number,
    sidedness: string,
    measureOnly = false,
  ): Promise<number> {
    if (sidedness === "single") {
      const lineX = x + 0.3;
      let currentY = y;

      if (!measureOnly) {
        // Draw vertical line
        this.currentSlide?.addShape(this.pptx.ShapeType.line, {
          x: lineX,
          y: y,
          w: 0,
          h: items.length * 1.2,
          line: { width: 3, color: this.THEME.primary },
        });
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        if (!measureOnly) {
          // Add timeline circle with number
          this.currentSlide?.addShape(this.pptx.ShapeType.ellipse, {
            x: lineX - 0.15,
            y: currentY,
            w: 0.3,
            h: 0.3,
            fill: { color: "000000" },
            line: { width: 3, color: "FFFFFF" },
          });

          // Add number
          this.currentSlide?.addText((i + 1).toString(), {
            x: lineX - 0.15,
            y: currentY,
            w: 0.3,
            h: 0.3,
            fontSize: 10,
            bold: true,
            color: "FFFFFF",
            align: "center",
            valign: "middle",
          });

          // Add content box
          this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
            x: x + 0.8,
            y: currentY - 0.2,
            w: width - 1.2,
            h: 0.8,
            fill: { color: this.THEME.background },
            line: { width: 4, color: this.THEME.primary },
          });

          // Add content text
          const itemText = this.extractText(item);
          this.currentSlide?.addText(itemText, {
            x: x + 0.9,
            y: currentY - 0.1,
            w: width - 1.4,
            h: 0.6,
            fontSize: 11,
            valign: "middle",
            align: "left",
            color: this.THEME.text,
          });
        }

        currentY += 1.2;
      }

      return currentY - y + 0.3;
    } else {
      // Double-sided vertical timeline
      let currentY = y;

      if (!measureOnly) {
        // Draw vertical line
        this.currentSlide?.addShape(this.pptx.ShapeType.line, {
          x: x + width / 2,
          y: y,
          w: 0,
          h: items.length * 1.2,
          line: { width: 2, color: this.THEME.primary },
        });
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const isEven = (i + 1) % 2 === 0;

        if (!measureOnly) {
          // Add timeline circle
          this.currentSlide?.addShape(this.pptx.ShapeType.ellipse, {
            x: x + width / 2 - 0.15,
            y: currentY,
            w: 0.3,
            h: 0.3,
            fill: { color: this.THEME.primary },
            line: { width: 2, color: "FFFFFF" },
          });
        }

        // Add content box (alternating sides)
        const contentX = isEven ? x + width * 0.55 : x;
        const contentW = width * 0.4;

        if (!measureOnly) {
          this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
            x: contentX,
            y: currentY - 0.2,
            w: contentW,
            h: 0.8,
            fill: { color: this.THEME.background },
            line: { width: 1, color: this.THEME.primary },
          });
        }

        // Add content text
        const itemText = this.extractText(item);
        if (!measureOnly) {
          this.currentSlide?.addText(itemText, {
            x: contentX + 0.1,
            y: currentY - 0.1,
            w: contentW - 0.2,
            h: 0.6,
            fontSize: 11,
            valign: "middle",
            align: "left",
          });
        }

        currentY += 1.2;
      }

      return currentY - y + 0.3;
    }
  }

  private async addHorizontalTimeline(
    items: (TTimelineItemElement | TVisualizationListItemElement)[],
    x: number,
    y: number,
    width: number,
    sidedness: string,
    measureOnly = false,
  ): Promise<number> {
    if (sidedness === "single") {
      const lineY = y + 0.8;
      const itemWidth = width / items.length;

      if (!measureOnly) {
        // Draw horizontal line
        this.currentSlide?.addShape(this.pptx.ShapeType.line, {
          x: x,
          y: lineY,
          w: width,
          h: 0,
          line: { width: 3, color: this.THEME.primary },
        });
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const itemX = x + i * itemWidth + itemWidth / 2;

        if (!measureOnly) {
          // Add timeline circle
          this.currentSlide?.addShape(this.pptx.ShapeType.ellipse, {
            x: itemX - 0.15,
            y: lineY - 0.15,
            w: 0.3,
            h: 0.3,
            fill: { color: this.THEME.primary },
            line: { width: 2, color: "FFFFFF" },
          });
        }

        if (!measureOnly) {
          // Add content box below
          this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
            x: itemX - itemWidth * 0.4,
            y: lineY + 0.5,
            w: itemWidth * 0.8,
            h: 0.6,
            fill: { color: this.THEME.background },
            line: { width: 1, color: this.THEME.primary },
          });
        }

        // Add content text
        const itemText = this.extractText(item);
        if (!measureOnly) {
          this.currentSlide?.addText(itemText, {
            x: itemX - itemWidth * 0.35,
            y: lineY + 0.55,
            w: itemWidth * 0.7,
            h: 0.5,
            fontSize: 10,
            align: "left",
            valign: "middle",
          });
        }
      }

      return 2.5;
    } else {
      // Double-sided horizontal timeline
      const lineY = y + 1.5;
      const itemWidth = width / items.length;

      if (!measureOnly) {
        // Draw horizontal line
        this.currentSlide?.addShape(this.pptx.ShapeType.line, {
          x: x,
          y: lineY,
          w: width,
          h: 0,
          line: { width: 2, color: this.THEME.primary },
        });
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const itemX = x + i * itemWidth + itemWidth / 2;
        const isAbove = i % 2 === 0;

        if (!measureOnly) {
          // Add timeline circle
          this.currentSlide?.addShape(this.pptx.ShapeType.ellipse, {
            x: itemX - 0.2,
            y: lineY - 0.2,
            w: 0.4,
            h: 0.4,
            fill: { color: this.THEME.primary },
            line: { width: 4, color: "FFFFFF" },
          });
        }

        // Add number
        this.currentSlide?.addText((i + 1).toString(), {
          x: itemX - 0.2,
          y: lineY - 0.2,
          w: 0.4,
          h: 0.4,
          fontSize: 10,
          bold: true,
          color: "FFFFFF",
          align: "center",
          valign: "middle",
        });

        // Add content box above/below alternating
        const boxY = isAbove ? lineY - 1 : lineY + 0.5;

        if (!measureOnly) {
          this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
            x: itemX - itemWidth * 0.4,
            y: boxY,
            w: itemWidth * 0.8,
            h: 0.6,
            fill: { color: this.THEME.background },
            line: { width: 1, color: this.THEME.primary },
          });
        }

        // Add content text
        const itemText = this.extractText(item);
        if (!measureOnly) {
          this.currentSlide?.addText(itemText, {
            x: itemX - itemWidth * 0.35,
            y: boxY + 0.05,
            w: itemWidth * 0.7,
            h: 0.5,
            fontSize: 10,
            align: "left",
            valign: "middle",
          });
        }
      }

      return 3.5;
    }
  }

  private async addCycle(
    element: TCycleGroupElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const items = element.children.filter((child) =>
      ["cycle-item", "visualization-item"].includes(
        (child as TCycleItemElement | TVisualizationListItemElement).type,
      ),
    );

    const centerX = x + width / 2;
    const centerY = y + 1.5;
    const radius = Math.min(width / 3, 1.2);

    if (!measureOnly) {
      // Add center cycle wheel SVG
      const cycleWheelSvg = this.createCycleWheelSVG(this.THEME.primary);
      await this.addSVGToSlide(
        cycleWheelSvg,
        centerX - 0.4,
        centerY - 0.4,
        0.8,
        0.8,
      );
    }

    // Position items around circle
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
      const itemX = centerX + radius * Math.cos(angle);
      const itemY = centerY + radius * Math.sin(angle);

      if (!measureOnly) {
        // Add item circle
        this.currentSlide?.addShape(this.pptx.ShapeType.ellipse, {
          x: itemX - 0.2,
          y: itemY - 0.2,
          w: 0.4,
          h: 0.4,
          fill: { color: this.getCycleColor(i) },
          line: { width: 1, color: "FFFFFF" },
        });

        // Add number
        this.currentSlide?.addText((i + 1).toString(), {
          x: itemX - 0.2,
          y: itemY - 0.2,
          w: 0.4,
          h: 0.4,
          fontSize: 12,
          bold: true,
          color: "FFFFFF",
          align: "center",
          valign: "middle",
        });

        // Add content text
        const itemText = this.extractText(item);
        const textRadius = radius + 0.5;
        const textX = centerX + textRadius * Math.cos(angle) - 0.8;
        const textY = centerY + textRadius * Math.sin(angle) - 0.2;

        this.currentSlide?.addText(itemText, {
          x: Math.max(x, Math.min(x + width - 1.6, textX)),
          y: Math.max(y, textY),
          w: 1.6,
          h: 0.4,
          fontSize: 10,
          align: "center",
          valign: "middle",
        });
      }
    }

    return 3.5;
  }

  private async addStaircase(
    element: TStairGroupElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const items = element.children.filter((child) =>
      ["stair-item", "visualization-item"].includes(
        (child as TStairItemElement | TVisualizationListItemElement).type,
      ),
    );

    const baseWidth = 1;
    const maxWidth = 3;
    const increment = (maxWidth - baseWidth) / (items.length - 1 || 1);
    let currentY = y;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const stepWidth = baseWidth + i * increment;

      if (!measureOnly) {
        // Add step rectangle
        this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
          x: x,
          y: currentY,
          w: stepWidth,
          h: 0.6,
          fill: { color: this.THEME.primary },
          line: { width: 1, color: "2F4F4F" },
        });

        // Add number
        this.currentSlide?.addText((i + 1).toString(), {
          x: x + 0.1,
          y: currentY + 0.1,
          w: 0.4,
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: "FFFFFF",
          align: "center",
          valign: "middle",
        });

        // Add content
        const itemText = this.extractText(item);
        this.currentSlide?.addText(itemText, {
          x: x + stepWidth + 0.2,
          y: currentY,
          w: width - stepWidth - 0.3,
          h: 0.6,
          fontSize: 12,
          valign: "middle",
          align: "left",
        });
      }

      currentY += 0.8;
    }

    return currentY - y + 0.2;
  }

  private async addIcons(
    element: TIconListElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const items = element.children.filter(
      (child) => (child as TIconListItemElement).type === "icon-item",
    );

    const columns = Math.min(3, Math.max(1, items.length));
    const columnWidth = width / columns;
    let maxHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as TIconListItemElement;
      const columnIndex = i % columns;
      const rowIndex = Math.floor(i / columns);

      const itemX = x + columnIndex * columnWidth;
      const itemY = y + rowIndex * 1.5;

      if (!measureOnly) {
        // Add icon placeholder
        this.currentSlide?.addShape(this.pptx.ShapeType.ellipse, {
          x: itemX + columnWidth / 2 - 0.3,
          y: itemY,
          w: 0.6,
          h: 0.6,
          fill: { color: this.THEME.primary },
          line: { width: 1, color: "FFFFFF" },
        });

        // Add icon text/content
        const itemText = this.extractText(item);
        this.currentSlide?.addText(itemText, {
          x: itemX,
          y: itemY + 0.8,
          w: columnWidth,
          h: 0.5,
          fontSize: 11,
          align: "center",
          valign: "middle",
        });
      }

      maxHeight = Math.max(maxHeight, (rowIndex + 1) * 1.5 + 0.5);
    }

    return maxHeight;
  }

  private async addImage(
    element: ImageElement,
    x: number,
    y: number,
    width: number,
    measureOnly = false,
  ): Promise<number> {
    const imageUrl: string | undefined = (element as Partial<ImageElement>).url;
    const height = 2; // Default image height

    if (!measureOnly && imageUrl && this.currentSlide) {
      try {
        const imageOptions: PptxGenJS.ImageProps = {
          path: imageUrl,
          x,
          y,
          w: width,
          h: height,
        };

        // Apply sizing based on objectFit setting (based on official PptxGenJS docs)
        // Default behavior: object-fit "cover" with centered object-position if no cropSettings
        const cropSettings = (
          element as unknown as { cropSettings?: ImageCropSettings }
        ).cropSettings;
        const objectFit = cropSettings?.objectFit || "cover";
        const objectPosition = cropSettings?.objectPosition || {
          x: 0.5,
          y: 0.5,
        };

        // Apply sizing according to official PptxGenJS documentation
        switch (objectFit) {
          case "contain":
            // contain: shrinks image to fit completely within area, preserving ratio
            imageOptions.sizing = {
              type: "contain",
              w: width,
              h: height,
            };
            break;
          case "cover":
            // cover: shrinks image to completely fill area, crops excess, preserving ratio
            imageOptions.sizing = {
              type: "cover",
              w: width,
              h: height,
            };
            break;
          case "fill":
            // fill: no sizing property = default stretch behavior
            break;
          default:
            // Use crop with positioning offsets
            imageOptions.sizing = {
              type: "crop",
              w: width,
              h: height,
              // x, y are positions relative to the source image for cropping
              x: objectPosition.x * width * 0.1, // Adjust multiplier as needed
              y: objectPosition.y * height * 0.1, // Adjust multiplier as needed
            };
            break;
        }
        this.currentSlide.addImage(imageOptions);
      } catch (error) {
        console.warn("Failed to add image:", error);
      }
    }

    return height + 0.2;
  }

  // SVG Creation Methods
  private createArrowSVG(fillColor: string): string {
    const { path, viewBox } = this.SVG_DEFINITIONS.arrow;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
      <path d="${path}" fill="#${fillColor}" />
    </svg>`;
  }

  private createCycleWheelSVG(fillColor: string): string {
    const { paths, viewBox } = this.SVG_DEFINITIONS.cycle;
    const pathElements = paths
      .map((path) => `<path d="${path}" fill="#${fillColor}" />`)
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
      ${pathElements}
    </svg>`;
  }

  private createPyramidLevelSVG(
    width: number,
    height: number,
    fillColor: string,
    clipPath: string,
    number: string,
  ): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <clipPath id="pyramidClip">
          <path d="M0,0 L${width},0 L${width},${height} L0,${height} Z" style="clip-path: ${clipPath};" />
        </clipPath>
      </defs>
      <rect width="100%" height="100%" fill="#${fillColor}" clip-path="url(#pyramidClip)" />
      <text x="20" y="${height / 2 + 5}" fill="white" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="bold">${number}</text>
    </svg>`;
  }

  private async addSVGToSlide(
    svgContent: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!this.currentSlide) return;

    try {
      // Convert SVG to data URL
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgContent)}`;

      this.currentSlide.addImage({
        data: svgDataUrl,
        x,
        y,
        w,
        h,
      });
    } catch (error) {
      console.warn("Failed to add SVG:", error);
      // Fallback to basic shape if SVG fails
      this.currentSlide?.addShape(this.pptx.ShapeType.rect, {
        x,
        y,
        w,
        h,
        fill: { color: this.THEME.primary },
      });
    }
  }

  // Helper Methods
  private extractText(element: unknown): string {
    const isTextNode = (n: unknown): n is TextNode => {
      if (!n || typeof n !== "object") return false;
      return "text" in (n as Record<string, unknown>);
    };
    const hasChildren = (n: unknown): n is { children: unknown[] } => {
      if (!n || typeof n !== "object") return false;
      return Array.isArray((n as { children?: unknown }).children);
    };

    if (isTextNode(element)) {
      return element.text ?? "";
    }

    if (hasChildren(element)) {
      return element.children
        .map((child) => this.extractText(child))
        .join(" ")
        .trim();
    }

    return "";
  }

  private getTextOptions(
    element: PlateNode,
    fontSize: number,
  ): PptxGenJS.TextPropsOptions {
    const options: PptxGenJS.TextPropsOptions = {
      fontSize,
      color: this.THEME.text,
    };

    // Extract text styling from first text node
    if (
      "children" in element &&
      element.children &&
      element.children.length > 0
    ) {
      const firstChild = element.children[0] as Partial<TextNode> &
        Partial<{
          fontFamily: string;
          color: string;
          fontSize: number | string;
        }>;
      if (typeof firstChild === "object" && firstChild) {
        if (typeof firstChild.fontFamily === "string")
          options.fontFace = firstChild.fontFamily as string;
        if (
          typeof firstChild.fontSize === "number" ||
          typeof firstChild.fontSize === "string"
        ) {
          const parsed = this.parseFontSizeToPoints(
            firstChild.fontSize as number | string,
          );
          if (parsed) options.fontSize = parsed;
        }
        if (typeof firstChild.color === "string") {
          const raw = (firstChild.color as string).trim();
          // Only accept direct hex; ignore CSS variables like var(--presentation-text)
          const hexMatch = raw.match(/^#?[0-9A-Fa-f]{6}$/);
          if (hexMatch) options.color = raw.replace("#", "");
        }
      }
    }

    // Ensure default Inter fallback if not set via marks
    if (!options.fontFace) options.fontFace = "Inter";

    return options;
  }

  private extractTextRuns(element: unknown): PptxGenJS.TextProps[] {
    const runs: PptxGenJS.TextProps[] = [];

    const isTextNode = (n: unknown): n is TextNode => {
      if (!n || typeof n !== "object") return false;
      return "text" in (n as Record<string, unknown>);
    };
    const hasChildren = (n: unknown): n is { children: unknown[] } => {
      if (!n || typeof n !== "object") return false;
      return Array.isArray((n as { children?: unknown }).children);
    };

    const walk = (node: unknown) => {
      if (isTextNode(node)) {
        const text = node.text ?? "";
        if (text.length === 0) return;
        const runOptions: PptxGenJS.TextPropsOptions = {};
        if (node.bold) runOptions.bold = true;
        if (node.italic) runOptions.italic = true;
        if (node.underline) runOptions.underline = { style: "sng" };
        if (node.strikethrough) runOptions.strike = true;
        // Font family per-run
        if (typeof node.fontFamily === "string" && node.fontFamily.trim()) {
          runOptions.fontFace = node.fontFamily.trim();
        }
        // Font size per-run
        if (
          typeof node.fontSize === "number" ||
          typeof node.fontSize === "string"
        ) {
          const parsed = this.parseFontSizeToPoints(node.fontSize);
          if (parsed) runOptions.fontSize = parsed;
        }
        // Text color per-run (hex only)
        if (typeof node.color === "string") {
          const raw = node.color.trim();
          const hexMatch = raw.match(/^#?[0-9A-Fa-f]{6}$/);
          if (hexMatch) runOptions.color = raw.replace("#", "");
        }
        // Background highlight per-run
        if (typeof node.backgroundColor === "string") {
          const raw = node.backgroundColor.trim();
          const hexMatch = raw.match(/^#?[0-9A-Fa-f]{6}$/);
          if (hexMatch) runOptions.highlight = raw.replace("#", "");
        }
        runs.push({ text, options: runOptions });
        return;
      }
      if (hasChildren(node)) {
        for (const child of node.children) {
          walk(child);
        }
      }
    };

    walk(element);
    return runs;
  }

  // Convert font size mark (px or pt) to points for PptxGenJS
  private parseFontSizeToPoints(value: number | string): number | null {
    if (typeof value === "number") {
      // Heuristic: If value is large (>= 72), assume px and convert to pt
      if (value >= 72) return Math.round((value * 3) / 4);
      return value; // assume pt
    }
    const v = value.trim();
    if (!v) return null;
    const pxMatch = v.match(/^(\d+(?:\.\d+)?)px$/i);
    if (pxMatch) return Math.round((parseFloat(pxMatch[1]!) * 3) / 4);
    const ptMatch = v.match(/^(\d+(?:\.\d+)?)pt$/i);
    if (ptMatch) return parseFloat(ptMatch[1]!);
    const numMatch = v.match(/^(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const n = parseFloat(numMatch[1]!);
      // Default assume pt if no unit
      return n;
    }
    return null;
  }

  private async measureElements(
    elements: PlateNode[],
    width: number,
  ): Promise<number> {
    let total = 0;
    for (const element of elements) {
      const h = await this.processElement(element, 0, 0, width, true);
      total += h;
    }
    return total;
  }

  private getCycleColor(index: number): string {
    const colors = ["4472C4", "70AD47", "FFC000", "C5504B"];
    return colors[index % colors.length] ?? "4472C4";
  }
}

// Usage function
export async function convertPlateJSToPPTX(
  presentationData: PresentationData,
  theme?: Partial<ThemeColors>,
): Promise<ArrayBuffer> {
  const converter = new PlateJSToPPTXConverter(theme);
  const pptx = await converter.convertToPPTX(presentationData);
  const output = await pptx.write({ outputType: "arraybuffer" });
  // Type guards: library type says it can be string | ArrayBuffer | Blob | Uint8Array
  if (output instanceof ArrayBuffer) return output;
  if (output instanceof Uint8Array) {
    const view = output;
    const ab = new ArrayBuffer(view.byteLength);
    new Uint8Array(ab).set(view);
    return ab;
  }
  if (typeof output === "string") {
    // base64 or binarystring; convert to ArrayBuffer
    const view = new TextEncoder().encode(output);
    const ab = new ArrayBuffer(view.byteLength);
    new Uint8Array(ab).set(view);
    return ab;
  }
  // Blob fallback
  const arrayBuf = await (output as Blob).arrayBuffer();
  return arrayBuf;
}
