"""Document processing service using PyMuPDF with layout-aware fusion"""
import fitz  # PyMuPDF
from PIL import Image
import io
import os
import asyncio
import base64
from typing import List, Tuple, Optional, Dict, Any, Set
import logging
from ..models.document import ProcessedDocument, PageData, ImageData, BoundingBox
from ..utils.helpers import generate_document_id, generate_file_hash
from .image_processor import ImageProcessor

logger = logging.getLogger(__name__)


class FigureChunk:
    """Represents a layout-aware figure chunk with fused context"""
    def __init__(
        self,
        chunk_id: str,
        page_number: int,
        bbox: BoundingBox,
        image_caption: str = "",
        ocr_text: str = "",
        overlaid_text: str = "",  # Text rendered ON TOP of the image
        nearby_text: str = "",    # Text near but outside the image
        image_base64: Optional[str] = None
    ):
        self.chunk_id = chunk_id
        self.page_number = page_number
        self.bbox = bbox
        self.image_caption = image_caption
        self.ocr_text = ocr_text
        self.overlaid_text = overlaid_text
        self.nearby_text = nearby_text
        self.image_base64 = image_base64
    
    def get_fused_content(self) -> str:
        """
        Get the fused content for embedding - combines all context sources
        
        Priority order for graph/chart understanding:
        1. Overlaid text (axis labels, titles, data values ON the image)
        2. OCR text (embedded text in the image itself)
        3. Image caption (visual description)
        4. Nearby text (surrounding context/explanations)
        """
        parts = []
        
        # Overlaid text is highest priority - it's the actual labels/values
        if self.overlaid_text:
            parts.append(f"[Labels & Values]: {self.overlaid_text}")
        
        # OCR captures text embedded in the image
        if self.ocr_text:
            parts.append(f"[Text in Figure]: {self.ocr_text}")
        
        # Caption describes what the figure shows
        if self.image_caption:
            parts.append(f"[Figure Description]: {self.image_caption}")
        
        # Nearby text provides context
        if self.nearby_text:
            parts.append(f"[Context]: {self.nearby_text}")
        
        return "\n".join(parts) if parts else "Figure with no extractable content"


class DocumentProcessor:
    """Process PDF documents with layout-aware fusion for better embeddings"""
    
    # Margin (in points) to search for nearby text blocks around images
    PROXIMITY_MARGIN = 80  # ~1.1 inches - increased for better context capture
    # Small margin for detecting overlaid text (text rendered on image)
    OVERLAP_TOLERANCE = 10  # Tolerance for edge cases
    # Threshold for overlap ratio to consider text as overlaid
    OVERLAP_RATIO_THRESHOLD = 0.15  # 15% overlap is enough to consider overlaid
    # Vertical alignment tolerance for bar chart labels (text within image Y bounds)
    VERTICAL_ALIGNMENT_TOLERANCE = 20  # points
    
    def __init__(self, image_processor: ImageProcessor):
        """
        Initialize document processor
        
        Args:
            image_processor: ImageProcessor instance for generating captions and OCR
        """
        self.image_processor = image_processor
    
    async def process_pdf(
        self,
        pdf_path: str,
        filename: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        max_concurrent_pages: int = 5
    ) -> ProcessedDocument:
        """
        Process PDF file with layout-aware fusion
        
        This method handles the common case where text is OVERLAID on images
        (like axis labels on charts, titles on graphs, data values on diagrams):
        
        1. Extracts ALL text blocks with their bounding boxes
        2. Extracts ALL images with their bounding boxes
        3. For each image:
           - Finds text blocks INSIDE the image bbox (overlaid text)
           - Finds text blocks NEAR the image bbox (context text)
           - Runs OCR on the image
           - Generates a visual caption
        4. Fuses all sources into unified figure chunks
        5. Removes overlaid text from page text to avoid duplication
        
        Args:
            pdf_path: Path to PDF file
            filename: Original filename
            title: User-provided document title
            description: User-provided description
            max_concurrent_pages: Maximum pages to process concurrently
            
        Returns:
            ProcessedDocument with layout-aware fused data
        """
        logger.info(f"Processing PDF with layout-aware fusion (handles overlaid text): {filename}")
        
        try:
            # Generate file hash for deduplication
            file_hash = generate_file_hash(pdf_path)
            logger.debug(f"File hash: {file_hash[:16]}...")
            
            # Open PDF
            doc = fitz.open(pdf_path)
            document_id = generate_document_id()
            total_pages = len(doc)
            
            logger.info(f"Processing {total_pages} pages with layout-aware fusion")
            
            # Process pages in parallel
            semaphore = asyncio.Semaphore(max_concurrent_pages)
            
            async def process_page(page_num: int) -> PageData:
                async with semaphore:
                    logger.debug(f"Processing page {page_num + 1}/{total_pages} with layout analysis")
                    page = doc[page_num]
                    
                    # Extract ALL text blocks with layout info
                    text_blocks = self._extract_text_blocks(page)
                    
                    # Extract images with layout-aware fusion
                    # This returns (images, consumed_block_indices)
                    images, consumed_indices = await self._extract_images_with_fusion(
                        page, page_num, document_id, text_blocks
                    )
                    
                    # Also detect vector charts (drawn as paths, not embedded images)
                    vector_images, vector_consumed = await self._detect_vector_charts(
                        page, page_num, document_id, text_blocks, consumed_indices
                    )
                    images.extend(vector_images)
                    consumed_indices.update(vector_consumed)
                    
                    # Get page text EXCLUDING text that was fused with images
                    page_text = self._get_non_figure_text(text_blocks, consumed_indices)
                    
                    logger.debug(
                        f"Page {page_num + 1}: {len(images)} figures (including vector), "
                        f"{len(consumed_indices)} text blocks fused with figures"
                    )
                    
                    return PageData(
                        page_number=page_num,
                        text=page_text,
                        images=images
                    )
            
            # Process all pages concurrently
            pages_data = await asyncio.gather(*[process_page(i) for i in range(total_pages)])
            
            doc.close()
            
            # Create processed document
            processed_doc = ProcessedDocument(
                document_id=document_id,
                filename=filename,
                filepath=pdf_path,
                file_hash=file_hash,
                pages=pages_data,
                total_pages=len(pages_data),
                title=title,
                description=description
            )
            
            total_figures = sum(len(p.images) for p in pages_data)
            logger.info(f"PDF processed: {len(pages_data)} pages, {total_figures} figure chunks with fused context")
            return processed_doc
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise
    
    def _extract_text_blocks(self, page: fitz.Page) -> List[Dict[str, Any]]:
        """
        Extract text blocks with their bounding boxes from a page
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            List of text blocks with bbox, content, and index
        """
        blocks = []
        
        # Get text blocks with position info
        page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        
        for idx, block in enumerate(page_dict.get("blocks", [])):
            if block.get("type") == 0:  # Text block
                bbox = block.get("bbox", (0, 0, 0, 0))
                
                # Extract text from lines/spans
                text_parts = []
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text_parts.append(span.get("text", ""))
                
                text = " ".join(text_parts).strip()
                
                if text:
                    blocks.append({
                        "index": idx,
                        "bbox": BoundingBox(x0=bbox[0], y0=bbox[1], x1=bbox[2], y1=bbox[3]),
                        "text": text
                    })
        
        return blocks
    
    def _get_non_figure_text(
        self, 
        text_blocks: List[Dict[str, Any]], 
        consumed_indices: Set[int]
    ) -> str:
        """
        Get page text excluding blocks that were fused with figures
        
        Args:
            text_blocks: All text blocks from the page
            consumed_indices: Indices of blocks that were fused with figures
            
        Returns:
            Combined text from non-figure blocks
        """
        non_figure_texts = []
        for block in text_blocks:
            if block["index"] not in consumed_indices:
                non_figure_texts.append(block["text"])
        
        return "\n".join(non_figure_texts)
    
    def _find_overlaid_and_nearby_text(
        self,
        image_bbox: BoundingBox,
        text_blocks: List[Dict[str, Any]],
        margin: float = None
    ) -> Tuple[str, str, Set[int]]:
        """
        Find text blocks that are INSIDE (overlaid) or NEAR an image
        
        This is crucial for charts/graphs where axis labels and titles
        are rendered as text ON TOP of the image (e.g., bar chart labels).
        
        Detection strategies:
        1. Text completely inside image bbox (fully overlaid)
        2. Text with significant overlap (>15% of text area)
        3. Text vertically aligned within image bounds (bar chart labels)
        4. Text near image bounds (context/captions)
        
        Args:
            image_bbox: Bounding box of the image
            text_blocks: List of text blocks with bboxes
            margin: Proximity margin for nearby text
            
        Returns:
            Tuple of (overlaid_text, nearby_text, consumed_block_indices)
        """
        if margin is None:
            margin = self.PROXIMITY_MARGIN
        
        overlaid_texts = []
        nearby_texts = []
        consumed_indices = set()
        
        # Expand image bbox slightly to catch edge cases
        inner_bbox = BoundingBox(
            x0=image_bbox.x0 - self.OVERLAP_TOLERANCE,
            y0=image_bbox.y0 - self.OVERLAP_TOLERANCE,
            x1=image_bbox.x1 + self.OVERLAP_TOLERANCE,
            y1=image_bbox.y1 + self.OVERLAP_TOLERANCE
        )
        
        # Larger bbox for nearby text (context)
        outer_bbox = BoundingBox(
            x0=image_bbox.x0 - margin,
            y0=image_bbox.y0 - margin,
            x1=image_bbox.x1 + margin,
            y1=image_bbox.y1 + margin
        )
        
        for block in text_blocks:
            block_bbox = block["bbox"]
            block_idx = block["index"]
            text = block["text"]
            
            is_overlaid = False
            
            # Strategy 1: Text completely inside image (fully overlaid)
            if self._bbox_contains(inner_bbox, block_bbox):
                is_overlaid = True
                logger.debug(f"Overlaid (contained): '{text[:40]}...'")
            
            # Strategy 2: Significant overlap (>15% of text area overlaps with image)
            elif self._bbox_overlap_ratio(image_bbox, block_bbox) > self.OVERLAP_RATIO_THRESHOLD:
                is_overlaid = True
                logger.debug(f"Overlaid (overlap): '{text[:40]}...'")
            
            # Strategy 3: Text vertically within image bounds and horizontally overlapping
            # This catches bar chart labels that sit ON TOP of bars
            elif self._is_vertically_aligned_within(block_bbox, image_bbox):
                is_overlaid = True
                logger.debug(f"Overlaid (vertical align): '{text[:40]}...'")
            
            if is_overlaid:
                overlaid_texts.append(text)
                consumed_indices.add(block_idx)
            
            # Strategy 4: Text near image (context/captions)
            elif self._bboxes_overlap(outer_bbox, block_bbox):
                nearby_texts.append(text)
                consumed_indices.add(block_idx)
        
        return " ".join(overlaid_texts), " ".join(nearby_texts), consumed_indices
    
    def _is_vertically_aligned_within(self, text_bbox: BoundingBox, image_bbox: BoundingBox) -> bool:
        """
        Check if text is vertically within image bounds and horizontally overlapping.
        This catches bar chart labels that are rendered on top of bars.
        
        For a horizontal bar chart:
        - Labels are within the vertical extent of the chart
        - Labels start at or near the left edge of bars (which overlap with image)
        """
        tolerance = self.VERTICAL_ALIGNMENT_TOLERANCE
        
        # Text must be vertically within the image bounds (with tolerance)
        text_vertically_in_image = (
            text_bbox.y0 >= image_bbox.y0 - tolerance and
            text_bbox.y1 <= image_bbox.y1 + tolerance
        )
        
        # Text must horizontally overlap with image OR start within image
        text_horizontally_overlaps = (
            text_bbox.x0 < image_bbox.x1 and  # Text starts before image ends
            text_bbox.x1 > image_bbox.x0      # Text ends after image starts
        )
        
        # Alternative: text starts within the image horizontal bounds
        text_starts_in_image = (
            text_bbox.x0 >= image_bbox.x0 - tolerance and
            text_bbox.x0 <= image_bbox.x1 + tolerance
        )
        
        return text_vertically_in_image and (text_horizontally_overlaps or text_starts_in_image)
    
    def _bbox_contains(self, outer: BoundingBox, inner: BoundingBox) -> bool:
        """Check if outer bbox completely contains inner bbox"""
        return (
            outer.x0 <= inner.x0 and
            outer.y0 <= inner.y0 and
            outer.x1 >= inner.x1 and
            outer.y1 >= inner.y1
        )
    
    def _bbox_overlap_ratio(self, bbox1: BoundingBox, bbox2: BoundingBox) -> float:
        """
        Calculate the overlap ratio between two bounding boxes
        Returns the ratio of intersection area to the smaller bbox's area
        """
        # Calculate intersection
        x_left = max(bbox1.x0, bbox2.x0)
        y_top = max(bbox1.y0, bbox2.y0)
        x_right = min(bbox1.x1, bbox2.x1)
        y_bottom = min(bbox1.y1, bbox2.y1)
        
        if x_right < x_left or y_bottom < y_top:
            return 0.0
        
        intersection_area = (x_right - x_left) * (y_bottom - y_top)
        
        # Calculate areas
        bbox1_area = (bbox1.x1 - bbox1.x0) * (bbox1.y1 - bbox1.y0)
        bbox2_area = (bbox2.x1 - bbox2.x0) * (bbox2.y1 - bbox2.y0)
        
        # Use smaller area as denominator
        smaller_area = min(bbox1_area, bbox2_area)
        
        if smaller_area == 0:
            return 0.0
        
        return intersection_area / smaller_area
    
    def _bboxes_overlap(self, bbox1: BoundingBox, bbox2: BoundingBox) -> bool:
        """Check if two bounding boxes overlap at all"""
        return not (
            bbox1.x1 < bbox2.x0 or
            bbox1.x0 > bbox2.x1 or
            bbox1.y1 < bbox2.y0 or
            bbox1.y0 > bbox2.y1
        )
    
    async def _extract_images_with_fusion(
        self,
        page: fitz.Page,
        page_num: int,
        document_id: str,
        text_blocks: List[Dict[str, Any]],
        max_concurrent_images: int = 3
    ) -> Tuple[List[ImageData], Set[int]]:
        """
        Extract images with layout-aware fusion: overlaid text + OCR + caption + nearby text
        
        Args:
            page: PyMuPDF page object
            page_num: Page number
            document_id: Document ID
            text_blocks: Pre-extracted text blocks from page
            max_concurrent_images: Max concurrent image processing
            
        Returns:
            Tuple of (List of ImageData with fused content, Set of consumed block indices)
        """
        all_consumed_indices: Set[int] = set()
        
        try:
            image_list = page.get_images(full=True)
            
            if not image_list:
                return [], set()
            
            logger.debug(f"Extracting {len(image_list)} images with layout fusion from page {page_num}")
            
            semaphore = asyncio.Semaphore(max_concurrent_images)
            
            async def process_image_with_fusion(img_index: int, img_info: tuple) -> Tuple[Optional[ImageData], Set[int]]:
                async with semaphore:
                    consumed = set()
                    try:
                        xref = img_info[0]
                        base_image = page.parent.extract_image(xref)
                        image_bytes = base_image["image"]
                        
                        # Convert to PIL Image
                        pil_image = Image.open(io.BytesIO(image_bytes))
                        
                        # Skip very small images (likely icons/bullets)
                        if pil_image.width < 50 or pil_image.height < 50:
                            logger.debug(f"Skipping small image {img_index} ({pil_image.width}x{pil_image.height})")
                            return None, set()
                        
                        # Get image bounding box
                        image_rects = page.get_image_rects(xref)
                        if image_rects:
                            rect = image_rects[0]
                            bbox = BoundingBox(
                                x0=rect.x0,
                                y0=rect.y0,
                                x1=rect.x1,
                                y1=rect.y1
                            )
                        else:
                            bbox = BoundingBox(x0=0, y0=0, x1=100, y1=100)
                        
                        # 1. Find OVERLAID text (text rendered ON the image) and NEARBY text
                        overlaid_text, nearby_text, consumed = self._find_overlaid_and_nearby_text(
                            bbox, text_blocks
                        )
                        
                        # 2. Run OCR on image to extract embedded text
                        ocr_text = await self._run_ocr_on_image(pil_image)
                        
                        # 3. Generate image caption (visual description)
                        caption = await self.image_processor.generate_caption(pil_image)
                        
                        # Create FigureChunk for fused content
                        figure_chunk = FigureChunk(
                            chunk_id=f"{document_id}_p{page_num}_fig{img_index}",
                            page_number=page_num,
                            bbox=bbox,
                            image_caption=caption,
                            ocr_text=ocr_text,
                            overlaid_text=overlaid_text,
                            nearby_text=nearby_text
                        )
                        
                        # Get fused content for embedding
                        fused_content = figure_chunk.get_fused_content()
                        
                        # Create ImageData with fused caption
                        image_data = ImageData(
                            image_id=f"{document_id}_p{page_num}_fig{img_index}",
                            caption=fused_content,
                            bbox=bbox,
                            page_number=page_num,
                            image_bytes=image_bytes
                        )
                        
                        logger.debug(
                            f"Figure {img_index} on page {page_num}: "
                            f"overlaid={len(overlaid_text)}chars, ocr={len(ocr_text)}chars, "
                            f"caption={len(caption)}chars, nearby={len(nearby_text)}chars"
                        )
                        return image_data, consumed
                        
                    except Exception as e:
                        logger.warning(f"Failed to process image {img_index} on page {page_num}: {e}")
                        return None, set()
            
            # Process all images concurrently
            results = await asyncio.gather(*[
                process_image_with_fusion(i, img_info) 
                for i, img_info in enumerate(image_list)
            ])
            
            # Collect results and consumed indices
            images_data = []
            for img_data, consumed in results:
                if img_data is not None:
                    images_data.append(img_data)
                all_consumed_indices.update(consumed)
            
            logger.debug(f"Extracted {len(images_data)} figure chunks from page {page_num}")
            return images_data, all_consumed_indices
            
        except Exception as e:
            logger.error(f"Error extracting images from page {page_num}: {e}")
            return [], set()
    
    async def _run_ocr_on_image(self, pil_image: Image.Image) -> str:
        """
        Run OCR on an image to extract embedded text (charts, diagrams, etc.)
        
        Uses the image processor's vision model for OCR
        
        Args:
            pil_image: PIL Image object
            
        Returns:
            Extracted text from the image
        """
        try:
            ocr_text = await self.image_processor.extract_text_from_image(pil_image)
            return ocr_text.strip() if ocr_text else ""
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return ""
    
    async def extract_page_images(
        self,
        page: fitz.Page,
        page_num: int,
        document_id: str,
        max_concurrent_images: int = 3
    ) -> List[ImageData]:
        """
        Legacy method for backward compatibility
        """
        text_blocks = self._extract_text_blocks(page)
        images, _ = await self._extract_images_with_fusion(
            page, page_num, document_id, text_blocks, max_concurrent_images
        )
        return images
    
    async def _detect_vector_charts(
        self,
        page: fitz.Page,
        page_num: int,
        document_id: str,
        text_blocks: List[Dict[str, Any]],
        already_consumed: Set[int]
    ) -> Tuple[List[ImageData], Set[int]]:
        """
        Detect vector-drawn charts (bar charts, line charts, etc.) that aren't embedded images.
        
        Many PDFs render charts as vector paths (rectangles, lines) with text overlaid.
        This method detects such patterns by looking for:
        1. Clustered colored rectangles (bar charts)
        2. Text that looks like chart labels (numbers, category names)
        3. Axis-like patterns (number sequences)
        
        Args:
            page: PyMuPDF page object
            page_num: Page number
            document_id: Document ID
            text_blocks: Pre-extracted text blocks
            already_consumed: Indices already consumed by image fusion
            
        Returns:
            Tuple of (ImageData list, consumed block indices)
        """
        consumed_indices: Set[int] = set()
        images_data: List[ImageData] = []
        
        try:
            # Get page drawings (vector graphics)
            drawings = page.get_drawings()
            
            if not drawings:
                return [], set()
            
            # Find clusters of colored rectangles (potential bar charts)
            colored_rects = []
            for d in drawings:
                if d.get("type") == "re":  # Rectangle
                    fill = d.get("fill")
                    # Colored filled rectangles are often chart bars
                    if fill and fill != (1, 1, 1) and fill != (0, 0, 0):  # Not white or black
                        rect = d.get("rect")
                        if rect:
                            colored_rects.append(BoundingBox(
                                x0=rect.x0, y0=rect.y0, x1=rect.x1, y1=rect.y1
                            ))
            
            if len(colored_rects) < 3:  # Need multiple bars to be a chart
                return [], set()
            
            logger.debug(f"Found {len(colored_rects)} colored rectangles (potential bar chart) on page {page_num}")
            
            # Calculate bounding box of all colored rects (chart area)
            chart_bbox = BoundingBox(
                x0=min(r.x0 for r in colored_rects),
                y0=min(r.y0 for r in colored_rects),
                x1=max(r.x1 for r in colored_rects),
                y1=max(r.y1 for r in colored_rects)
            )
            
            # Expand chart bbox to include axis labels
            expanded_chart_bbox = BoundingBox(
                x0=chart_bbox.x0 - 100,  # Room for Y-axis labels
                y0=chart_bbox.y0 - 50,   # Room for title
                x1=chart_bbox.x1 + 50,   # Room for legend
                y1=chart_bbox.y1 + 50    # Room for X-axis labels
            )
            
            # Find text blocks that belong to this chart
            overlaid_texts = []
            nearby_texts = []
            
            for block in text_blocks:
                if block["index"] in already_consumed:
                    continue
                    
                block_bbox = block["bbox"]
                text = block["text"]
                
                # Check if text is overlaid on chart bars
                if self._is_vertically_aligned_within(block_bbox, chart_bbox):
                    overlaid_texts.append(text)
                    consumed_indices.add(block["index"])
                    logger.debug(f"Vector chart label (overlaid): '{text[:40]}'")
                
                # Check if text is in the expanded chart area (axis labels, title)
                elif self._bboxes_overlap(expanded_chart_bbox, block_bbox):
                    # Distinguish axis labels from nearby context
                    if self._looks_like_axis_label(text):
                        overlaid_texts.append(text)
                    else:
                        nearby_texts.append(text)
                    consumed_indices.add(block["index"])
                    logger.debug(f"Vector chart context: '{text[:40]}'")
            
            if not overlaid_texts and not nearby_texts:
                return [], set()
            
            # Render this region to an image for captioning
            clip_rect = fitz.Rect(
                expanded_chart_bbox.x0, expanded_chart_bbox.y0,
                expanded_chart_bbox.x1, expanded_chart_bbox.y1
            )
            
            # Render at 2x for better quality
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat, clip=clip_rect)
            image_bytes = pix.tobytes("png")
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            # Generate caption and run OCR
            caption = await self.image_processor.generate_caption(pil_image)
            ocr_text = await self._run_ocr_on_image(pil_image)
            
            # Create figure chunk
            figure_chunk = FigureChunk(
                chunk_id=f"{document_id}_p{page_num}_vector0",
                page_number=page_num,
                bbox=expanded_chart_bbox,
                image_caption=caption,
                ocr_text=ocr_text,
                overlaid_text=" ".join(overlaid_texts),
                nearby_text=" ".join(nearby_texts)
            )
            
            fused_content = figure_chunk.get_fused_content()
            
            image_data = ImageData(
                image_id=f"{document_id}_p{page_num}_vector0",
                caption=fused_content,
                bbox=expanded_chart_bbox,
                page_number=page_num,
                image_bytes=image_bytes
            )
            
            logger.info(
                f"Detected vector chart on page {page_num}: "
                f"{len(overlaid_texts)} labels, {len(nearby_texts)} context blocks"
            )
            
            images_data.append(image_data)
            return images_data, consumed_indices
            
        except Exception as e:
            logger.warning(f"Error detecting vector charts on page {page_num}: {e}")
            return [], set()
    
    def _looks_like_axis_label(self, text: str) -> bool:
        """
        Heuristic to detect if text looks like a chart axis label.
        
        Axis labels are typically:
        - Numbers (0, 1, 2, 3... or percentages)
        - Short category names
        - Scale indicators (10K, 100M, etc.)
        """
        text = text.strip()
        
        # Pure numbers
        if text.replace(".", "").replace(",", "").replace("-", "").isdigit():
            return True
        
        # Percentages
        if text.endswith("%"):
            return True
        
        # Scale indicators (10K, 5M, etc.)
        if len(text) <= 5 and text[-1].upper() in "KMB" and text[:-1].replace(".", "").isdigit():
            return True
        
        # Short labels (likely category names)
        if len(text) <= 50 and "\n" not in text:
            return True
        
        return False
