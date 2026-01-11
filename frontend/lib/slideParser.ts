import type { Slide, SlideElement, TextNode, HeadingElement, ParagraphElement, ImageElement } from '@/types/presentation';

// Simple ID generator to replace nanoid
function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * XML Node interface for the parser
 */
interface XMLNode {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  children: XMLNode[];
  originalTagContent?: string;
}

/**
 * SlideParser - Parses XML presentation data into slide format
 * Supports streaming parsing for real-time generation
 */
export class SlideParser {
  private buffer = '';
  private completedSections: string[] = [];
  private parsedSlides: Slide[] = [];
  private lastInputLength = 0;
  private sectionIdMap = new Map<string, string>();
  private latestContent = '';

  /**
   * Parse a chunk of XML data
   */
  public parseChunk(chunk: string): Slide[] {
    this.latestContent = chunk;

    const isFullContent =
      chunk.length >= this.lastInputLength &&
      chunk.substring(0, this.lastInputLength) === this.buffer.substring(0, this.lastInputLength);

    if (isFullContent && this.lastInputLength > 0) {
      this.buffer = this.buffer + chunk.substring(this.lastInputLength);
    } else {
      this.buffer = chunk;
    }

    this.lastInputLength = chunk.length;
    this.extractCompleteSections();
    return this.processSections();
  }

  /**
   * Finalize parsing
   */
  public finalize(): Slide[] {
    try {
      this.extractCompleteSections();

      let remainingBuffer = this.buffer.trim();

      if (remainingBuffer.startsWith('<PRESENTATION')) {
        const tagEndIdx = remainingBuffer.indexOf('>');
        if (tagEndIdx !== -1) {
          remainingBuffer = remainingBuffer.substring(tagEndIdx + 1).trim();
        }
      }

      if (remainingBuffer.startsWith('<SECTION')) {
        const fixedSection = remainingBuffer + '</SECTION>';
        this.completedSections.push(fixedSection);
      }

      const finalSlides = this.processSections();
      this.latestContent = '';

      return finalSlides;
    } catch (e) {
      console.error('Error during finalization:', e);
      return [];
    }
  }

  public getAllSlides(): Slide[] {
    return this.parsedSlides;
  }

  public reset(): void {
    this.buffer = '';
    this.completedSections = [];
    this.parsedSlides = [];
    this.lastInputLength = 0;
    this.latestContent = '';
  }

  private processSections(): Slide[] {
    if (this.completedSections.length === 0) {
      return [];
    }

    const newSlides = this.completedSections.map(this.convertSectionToSlide);
    this.parsedSlides = [...this.parsedSlides, ...newSlides];
    this.completedSections = [];

    return newSlides;
  }

  private extractCompleteSections(): void {
    let startIdx = 0;
    let extractedSectionEndIdx = 0;

    const presentationStartIdx = this.buffer.indexOf('<PRESENTATION');
    if (presentationStartIdx !== -1 && presentationStartIdx < 10) {
      const tagEndIdx = this.buffer.indexOf('>', presentationStartIdx);
      if (tagEndIdx !== -1) {
        startIdx = tagEndIdx + 1;
        const commentStartIdx = this.buffer.indexOf('<!--', startIdx);
        if (commentStartIdx !== -1 && commentStartIdx < startIdx + 20) {
          const commentEndIdx = this.buffer.indexOf('-->', commentStartIdx);
          if (commentEndIdx !== -1) {
            startIdx = commentEndIdx + 3;
          }
        }
      }
    }

    while (true) {
      const sectionStartIdx = this.buffer.indexOf('<SECTION', startIdx);
      if (sectionStartIdx === -1) break;

      const sectionEndIdx = this.buffer.indexOf('</SECTION>', sectionStartIdx);
      const nextSectionIdx = this.buffer.indexOf('<SECTION', sectionStartIdx + 1);

      if (sectionEndIdx !== -1 && (nextSectionIdx === -1 || sectionEndIdx < nextSectionIdx)) {
        const completeSection = this.buffer.substring(sectionStartIdx, sectionEndIdx + '</SECTION>'.length);
        this.completedSections.push(completeSection);
        startIdx = sectionEndIdx + '</SECTION>'.length;
        extractedSectionEndIdx = startIdx;
      } else if (nextSectionIdx !== -1) {
        const partialSection = this.buffer.substring(sectionStartIdx, nextSectionIdx);
        if (
          partialSection.includes('<H1>') ||
          partialSection.includes('<H2>') ||
          partialSection.includes('<P>') ||
          partialSection.includes('<IMG')
        ) {
          this.completedSections.push(partialSection + '</SECTION>');
        }
        startIdx = nextSectionIdx;
        extractedSectionEndIdx = nextSectionIdx;
      } else {
        break;
      }
    }

    if (extractedSectionEndIdx > 0) {
      this.buffer = this.buffer.substring(extractedSectionEndIdx);
    }
  }

  private convertSectionToSlide = (sectionString: string): Slide => {
    const rootNode = this.parseXML(sectionString);
    const sectionNode = rootNode.children.find((child) => child.tag.toUpperCase() === 'SECTION');

    if (!sectionNode) {
      return { id: generateId(), content: [], layoutType: undefined, alignment: 'center' };
    }

    const sectionIdentifier = this.generateSectionIdentifier(sectionNode);
    let slideId: string;
    
    if (this.sectionIdMap.has(sectionIdentifier)) {
      slideId = this.sectionIdMap.get(sectionIdentifier)!;
    } else {
      slideId = generateId();
      this.sectionIdMap.set(sectionIdentifier, slideId);
    }

    let layoutType: 'left' | 'right' | 'vertical' | 'background' | undefined;
    const layoutAttr = sectionNode.attributes.layout;

    if (layoutAttr && ['left', 'right', 'vertical', 'background'].includes(layoutAttr)) {
      layoutType = layoutAttr as 'left' | 'right' | 'vertical' | 'background';
    }

    const slideElements: SlideElement[] = [];
    let rootImage: { query: string; url?: string; layoutType?: 'left' | 'right' | 'vertical' | 'background' } | undefined;

    for (const child of sectionNode.children) {
      if (child.tag.toUpperCase() === 'IMG') {
        const query = child.attributes.query || '';
        const url = child.attributes.url || child.attributes.src || '';
        
        if (query && !rootImage) {
          rootImage = { query, ...(url ? { url } : {}), ...(layoutType ? { layoutType } : {}) };
        }
        continue;
      }

      if (child.tag.toUpperCase() === 'DIV') {
        for (const divChild of child.children) {
          const processedElement = this.processTopLevelNode(divChild);
          if (processedElement) {
            slideElements.push(processedElement);
          }
        }
      } else {
        const processedElement = this.processTopLevelNode(child);
        if (processedElement) {
          slideElements.push(processedElement);
        }
      }
    }

    return {
      id: slideId,
      content: slideElements,
      ...(rootImage ? { rootImage } : {}),
      ...(layoutType ? { layoutType } : {}),
      alignment: 'center',
    };
  };

  private generateSectionIdentifier(sectionNode: XMLNode): string {
    const h1Node = sectionNode.children.find((child) => child.tag.toUpperCase() === 'H1');

    if (h1Node) {
      const headingContent = this.getTextContent(h1Node);
      if (headingContent.trim().length > 0) {
        return `heading-${headingContent.trim()}`;
      }
    }

    let fingerprint = '';
    const attrKeys = Object.keys(sectionNode.attributes).sort();
    if (attrKeys.length > 0) {
      fingerprint += attrKeys.map((key) => `${key}=${sectionNode.attributes[key]}`).join(';');
    }

    const childTags = sectionNode.children.slice(0, 3).map((child) => child.tag.toUpperCase());
    if (childTags.length > 0) {
      fingerprint += '|' + childTags.join('-');
    }

    if (fingerprint.length < 5) {
      return `section-${generateId(8)}`;
    }

    return fingerprint;
  }

  private processTopLevelNode(node: XMLNode): SlideElement | null {
    const tag = node.tag.toUpperCase();

    switch (tag) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        return this.createHeading(tag.toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', node);
      case 'P':
        return this.createParagraph(node);
      case 'IMG':
        return this.createImage(node);
      case 'BULLETS':
        return this.createBulletGroup(node);
      case 'ICONS':
        return this.createIconList(node);
      case 'TIMELINE':
        return this.createTimeline(node);
      case 'ARROWS':
        return this.createArrowList(node);
      case 'PYRAMID':
        return this.createPyramid(node);
      case 'CYCLE':
        return this.createCycle(node);
      case 'STAIRCASE':
        return this.createStaircase(node);
      case 'BOXES':
        return this.createBoxes(node);
      case 'COMPARE':
        return this.createCompare(node);
      case 'BEFORE-AFTER':
      case 'BEFOREAFTER':
        return this.createBeforeAfter(node);
      case 'PROS-CONS':
      case 'PROSCONS':
        return this.createProsCons(node);
      case 'TABLE':
        return this.createTable(node);
      case 'CHART':
        return this.createChart(node);
      default:
        return null;
    }
  }

  private parseXML(xmlString: string): XMLNode {
    const rootNode: XMLNode = {
      tag: 'ROOT',
      attributes: {},
      content: '',
      children: [],
    };

    let processedXml = xmlString;

    const presentationOpenStart = processedXml.indexOf('<PRESENTATION');
    if (presentationOpenStart !== -1) {
      const presentationOpenEnd = processedXml.indexOf('>', presentationOpenStart);
      if (presentationOpenEnd !== -1) {
        processedXml =
          processedXml.substring(0, presentationOpenStart) +
          processedXml.substring(presentationOpenEnd + 1);
      }
    }

    processedXml = processedXml.replace('</PRESENTATION>', '');

    try {
      let fixedXml = processedXml;
      if (fixedXml.includes('<SECTION') && !fixedXml.endsWith('</SECTION>')) {
        fixedXml += '</SECTION>';
      }
      this.parseElement(fixedXml, rootNode);
    } catch (error) {
      console.error('Error parsing XML:', error);
    }

    return rootNode;
  }

  private parseElement(xml: string, parentNode: XMLNode): void {
    let currentIndex = 0;

    while (currentIndex < xml.length) {
      const tagStart = xml.indexOf('<', currentIndex);

      if (tagStart === -1) {
        parentNode.content += xml.substring(currentIndex);
        break;
      }

      if (tagStart > currentIndex) {
        parentNode.content += xml.substring(currentIndex, tagStart);
      }

      const tagEnd = xml.indexOf('>', tagStart);
      if (tagEnd === -1) {
        parentNode.content += xml.substring(tagStart);
        break;
      }

      const tagContent = xml.substring(tagStart + 1, tagEnd);

      if (tagContent.startsWith('/')) {
        const closingTag = tagContent.substring(1);
        if (closingTag.toUpperCase() === parentNode.tag.toUpperCase()) {
          currentIndex = tagEnd + 1;
          break;
        } else {
          currentIndex = tagEnd + 1;
          continue;
        }
      }

      if (tagContent.startsWith('!--')) {
        const commentEnd = xml.indexOf('-->', tagStart);
        currentIndex = commentEnd !== -1 ? commentEnd + 3 : xml.length;
        continue;
      }

      let tagName: string;
      let attrString: string;

      const firstSpace = tagContent.indexOf(' ');
      if (firstSpace === -1) {
        tagName = tagContent;
        attrString = '';
      } else {
        tagName = tagContent.substring(0, firstSpace);
        attrString = tagContent.substring(firstSpace + 1);
      }

      if (tagName.startsWith('!') || tagName.startsWith('?')) {
        currentIndex = tagEnd + 1;
        continue;
      }

      const isSelfClosing = tagContent.endsWith('/');
      if (isSelfClosing) {
        tagName = tagName.replace(/\/$/, '');
      }

      const attributes: Record<string, string> = {};
      let attrRemaining = attrString.trim();

      while (attrRemaining.length > 0) {
        const eqIndex = attrRemaining.indexOf('=');
        if (eqIndex === -1) break;

        const attrName = attrRemaining.substring(0, eqIndex).trim();
        attrRemaining = attrRemaining.substring(eqIndex + 1).trim();

        let attrValue = '';
        const quoteChar = attrRemaining.charAt(0);

        if (quoteChar === '"' || quoteChar === "'") {
          const endQuoteIndex = attrRemaining.indexOf(quoteChar, 1);
          if (endQuoteIndex !== -1) {
            attrValue = attrRemaining.substring(1, endQuoteIndex);
            attrRemaining = attrRemaining.substring(endQuoteIndex + 1).trim();
          } else {
            attrValue = attrRemaining.substring(1);
            attrRemaining = '';
          }
        } else {
          const nextSpaceIndex = attrRemaining.indexOf(' ');
          if (nextSpaceIndex !== -1) {
            attrValue = attrRemaining.substring(0, nextSpaceIndex);
            attrRemaining = attrRemaining.substring(nextSpaceIndex + 1).trim();
          } else {
            attrValue = attrRemaining;
            attrRemaining = '';
          }
        }

        attributes[attrName] = attrValue;
      }

      const newNode: XMLNode = {
        tag: tagName,
        attributes,
        content: '',
        children: [],
        originalTagContent: xml.substring(tagStart, tagEnd + 1),
      };

      parentNode.children.push(newNode);
      currentIndex = tagEnd + 1;

      if (!isSelfClosing) {
        this.parseElement(xml.substring(currentIndex), newNode);
        const closingTag = `</${tagName}>`;
        const closingTagIndex = xml.indexOf(closingTag, currentIndex);

        if (closingTagIndex !== -1) {
          currentIndex = closingTagIndex + closingTag.length;
        } else {
          break;
        }
      }
    }
  }

  private createHeading(level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', node: XMLNode): HeadingElement {
    return {
      type: level,
      children: this.getTextDescendants(node),
    };
  }

  private createParagraph(node: XMLNode): ParagraphElement {
    return {
      type: 'p',
      children: this.getTextDescendants(node),
    };
  }

  private createImage(node: XMLNode): ImageElement | null {
    const query = node.attributes.query || '';
    const url = node.attributes.url || node.attributes.src || '';

    if (!query || query.trim().length < 3) {
      return null;
    }

    return {
      type: 'img',
      url,
      query,
      children: [{ text: '' }],
    };
  }

  private createBulletGroup(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'bullet',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'bullets', children: items };
  }

  private createIconList(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        const children: any[] = [];
        let query = '';

        for (const iconChild of child.children) {
          if (iconChild.tag.toUpperCase() === 'ICON') {
            query = iconChild.attributes.query || '';
          } else {
            const processed = this.processNode(iconChild);
            if (processed) children.push(processed);
          }
        }

        if (query) {
          children.unshift({ type: 'icon', query, children: [{ text: '' }] });
        }

        items.push({ type: 'icon-item', children });
      }
    }
    return { type: 'icons', children: items };
  }

  private createTimeline(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'timeline-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'timeline', children: items };
  }

  private createArrowList(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'arrow-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'arrows', children: items };
  }

  private createPyramid(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'pyramid-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'pyramid', children: items };
  }

  private createCycle(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'cycle-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'cycle', children: items };
  }

  private createStaircase(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'stair-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'staircase', children: items };
  }

  private createBoxes(node: XMLNode): SlideElement {
    const items: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        items.push({
          type: 'box-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'boxes', children: items };
  }

  private createCompare(node: XMLNode): SlideElement {
    const sides: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        sides.push({
          type: 'compare-side',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'compare', children: sides };
  }

  private createBeforeAfter(node: XMLNode): SlideElement {
    const sides: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'DIV') {
        sides.push({
          type: 'before-after-side',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'before-after', children: sides };
  }

  private createProsCons(node: XMLNode): SlideElement {
    const children: any[] = [];
    for (const child of node.children) {
      if (child.tag.toUpperCase() === 'PROS') {
        children.push({
          type: 'pros-item',
          children: this.processNodes(child.children),
        });
      } else if (child.tag.toUpperCase() === 'CONS') {
        children.push({
          type: 'cons-item',
          children: this.processNodes(child.children),
        });
      }
    }
    return { type: 'pros-cons', children };
  }

  private createTable(node: XMLNode): SlideElement {
    const rows: any[] = [];

    const parseRow = (rowNode: XMLNode): void => {
      const cells: any[] = [];
      for (const cellNode of rowNode.children) {
        const tag = cellNode.tag.toUpperCase();
        if (tag === 'TD' || tag === 'TH') {
          cells.push({
            type: tag === 'TH' ? 'th' : 'td',
            children: this.processNodes(cellNode.children),
          });
        }
      }
      if (cells.length > 0) {
        rows.push({ type: 'tr', children: cells });
      }
    };

    for (const child of node.children) {
      const tag = child.tag.toUpperCase();
      if (tag === 'TR' || tag === 'ROW') {
        parseRow(child);
      } else if (tag === 'THEAD' || tag === 'TBODY') {
        for (const row of child.children) {
          if (row.tag.toUpperCase() === 'TR') {
            parseRow(row);
          }
        }
      }
    }

    return { type: 'table', children: rows };
  }

  private createChart(node: XMLNode): SlideElement {
    const chartType = (node.attributes.charttype || 'bar').toLowerCase();
    const dataNodes = node.children.filter((child) => child.tag.toUpperCase() === 'DATA');

    let data: any[] = [];

    if (dataNodes.length > 0) {
      if (chartType === 'scatter') {
        data = dataNodes.map((d) => {
          const xNode = d.children.find((c) => c.tag.toUpperCase() === 'X');
          const yNode = d.children.find((c) => c.tag.toUpperCase() === 'Y');
          return {
            x: parseFloat(xNode?.content?.trim() || '0'),
            y: parseFloat(yNode?.content?.trim() || '0'),
          };
        });
      } else {
        data = dataNodes.map((d) => {
          const labelNode = d.children.find((c) => c.tag.toUpperCase() === 'LABEL');
          const valueNode = d.children.find((c) => c.tag.toUpperCase() === 'VALUE');
          return {
            label: labelNode?.content?.trim() || '',
            value: parseFloat(valueNode?.content?.trim() || '0'),
          };
        });
      }
    }

    const typeMap: Record<string, string> = {
      pie: 'pie-chart',
      bar: 'bar-chart',
      area: 'area-chart',
      radar: 'radar-chart',
      scatter: 'scatter-chart',
      line: 'line-chart',
    };

    return {
      type: typeMap[chartType] || 'bar-chart',
      data,
      children: [{ text: '' }],
    };
  }

  private processNodes(nodes: XMLNode[]): any[] {
    const result: any[] = [];
    for (const node of nodes) {
      const processed = this.processNode(node);
      if (processed) {
        result.push(processed);
      }
    }
    return result.length > 0 ? result : [{ text: '' }];
  }

  private processNode(node: XMLNode): any | null {
    const tag = node.tag.toUpperCase();

    switch (tag) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        return this.createHeading(tag.toLowerCase() as any, node);
      case 'P':
        return this.createParagraph(node);
      case 'IMG':
        return this.createImage(node);
      case 'LI':
        return {
          type: 'p',
          children: this.getTextDescendants(node),
          indent: 1,
          listStyleType: 'disc',
        };
      default:
        if (node.children.length > 0) {
          return {
            type: 'p',
            children: this.processNodes(node.children),
          };
        }
        return null;
    }
  }

  private getTextDescendants(node: XMLNode): any[] {
    const descendants: any[] = [];

    if (node.content) {
      descendants.push({ text: node.content });
    }

    for (const child of node.children) {
      const childTag = child.tag.toUpperCase();

      if (childTag === 'B' || childTag === 'STRONG') {
        descendants.push({ text: this.getTextContent(child), bold: true });
      } else if (childTag === 'I' || childTag === 'EM') {
        descendants.push({ text: this.getTextContent(child), italic: true });
      } else if (childTag === 'U') {
        descendants.push({ text: this.getTextContent(child), underline: true });
      } else {
        const processed = this.processNode(child);
        if (processed) {
          descendants.push(processed);
        }
      }
    }

    return descendants.length > 0 ? descendants : [{ text: '' }];
  }

  private getTextContent(node: XMLNode, trim = true): string {
    let text = trim ? node.content.trim() : node.content;
    for (const child of node.children) {
      text += this.getTextContent(child, false);
    }
    return text;
  }
}

/**
 * Parse complete XML presentation string
 */
export function parseSlideXml(xmlData: string): Slide[] {
  const parser = new SlideParser();
  parser.parseChunk(xmlData);
  parser.finalize();
  return parser.getAllSlides();
}
