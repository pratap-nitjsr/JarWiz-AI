"""Citation generator for PDF page highlighting"""
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from typing import List, Optional, Tuple
import logging
from ..models.document import BoundingBox

logger = logging.getLogger(__name__)


class CitationGenerator:
    """Generate citation images with highlighted text"""
    
    def __init__(self):
        """Initialize citation generator"""
        self.cache: dict = {}  # Cache for rendered pages
        logger.info("CitationGenerator initialized")
    
    async def generate_citation_image(
        self,
        pdf_path: str,
        page_number: int,
        highlight_texts: Optional[List[str]] = None,
        highlight_regions: Optional[List[BoundingBox]] = None
    ) -> str:
        """
        Generate highlighted page image as base64
        
        Args:
            pdf_path: Path to PDF file
            page_number: Page number to render (0-indexed)
            highlight_texts: List of text strings to highlight
            highlight_regions: List of BoundingBox regions to highlight
            
        Returns:
            Base64 encoded PNG image
        """
        try:
            logger.debug(f"Generating citation image for page {page_number}")
            
            # Check cache
            cache_key = f"{pdf_path}_{page_number}"
            if cache_key in self.cache and not highlight_texts and not highlight_regions:
                logger.debug("Returning cached page image")
                return self.cache[cache_key]
            
            # Open PDF
            doc = fitz.open(pdf_path)
            
            if page_number >= len(doc):
                logger.warning(f"Page {page_number} out of range")
                doc.close()
                return ""
            
            page = doc[page_number]
            
            # Render page to image at 2x resolution
            mat = fitz.Matrix(2, 2)  # 2x zoom
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Highlight text if specified
            if highlight_texts:
                for text in highlight_texts:
                    img = await self._highlight_text(img, page, text, mat)
            
            # Highlight regions if specified
            if highlight_regions:
                for region in highlight_regions:
                    img = self._highlight_region(img, region, mat)
            
            doc.close()
            
            # Convert to base64
            img_base64 = self._image_to_base64(img)
            
            # Cache the result
            if not highlight_texts and not highlight_regions:
                self.cache[cache_key] = img_base64
            
            logger.debug("Citation image generated successfully")
            return img_base64
            
        except Exception as e:
            logger.error(f"Error generating citation image: {e}")
            return ""
    
    async def _highlight_text(
        self,
        img: Image.Image,
        page: fitz.Page,
        text: str,
        matrix: fitz.Matrix
    ) -> Image.Image:
        """Highlight text on image"""
        try:
            # Find text instances on page
            text_instances = page.search_for(text)
            
            if not text_instances:
                logger.debug(f"Text not found on page: {text[:30]}...")
                return img
            
            # Create overlay for highlights
            overlay = Image.new('RGBA', img.size, (255, 255, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Draw highlights for each instance
            for rect in text_instances:
                # Transform coordinates with matrix
                x0 = int(rect.x0 * matrix.a)
                y0 = int(rect.y0 * matrix.d)
                x1 = int(rect.x1 * matrix.a)
                y1 = int(rect.y1 * matrix.d)
                
                # Draw semi-transparent yellow rectangle
                draw.rectangle(
                    [x0, y0, x1, y1],
                    fill=(255, 255, 0, 80)  # Yellow with transparency
                )
            
            # Composite images
            img = img.convert('RGBA')
            img = Image.alpha_composite(img, overlay)
            img = img.convert('RGB')
            
            return img
            
        except Exception as e:
            logger.error(f"Error highlighting text: {e}")
            return img
    
    def _highlight_region(
        self,
        img: Image.Image,
        bbox: BoundingBox,
        matrix: fitz.Matrix,
        color: Tuple[int, int, int, int] = (255, 255, 0, 80)
    ) -> Image.Image:
        """Highlight a specific region on image"""
        try:
            # Transform coordinates
            x0 = int(bbox.x0 * matrix.a)
            y0 = int(bbox.y0 * matrix.d)
            x1 = int(bbox.x1 * matrix.a)
            y1 = int(bbox.y1 * matrix.d)
            
            # Create overlay
            overlay = Image.new('RGBA', img.size, (255, 255, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Draw rectangle
            draw.rectangle([x0, y0, x1, y1], fill=color)
            
            # Composite
            img = img.convert('RGBA')
            img = Image.alpha_composite(img, overlay)
            img = img.convert('RGB')
            
            return img
            
        except Exception as e:
            logger.error(f"Error highlighting region: {e}")
            return img
    
    def _image_to_base64(self, img: Image.Image) -> str:
        """Convert PIL Image to base64 string"""
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        return img_base64
    
    def clear_cache(self):
        """Clear the page image cache"""
        self.cache.clear()
        logger.info("Citation cache cleared")
