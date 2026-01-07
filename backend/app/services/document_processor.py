"""Document processing service using PyMuPDF"""
import fitz  # PyMuPDF
from PIL import Image
import io
import os
from typing import List, Tuple
import logging
from ..models.document import ProcessedDocument, PageData, ImageData, BoundingBox
from ..utils.helpers import generate_document_id, generate_file_hash
from .image_processor import ImageProcessor

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Process PDF documents to extract text and images"""
    
    def __init__(self, image_processor: ImageProcessor):
        """
        Initialize document processor
        
        Args:
            image_processor: ImageProcessor instance for generating captions
        """
        self.image_processor = image_processor
    
    async def process_pdf(self, pdf_path: str, filename: str) -> ProcessedDocument:
        """
        Process PDF file to extract text and images with captions
        
        Args:
            pdf_path: Path to PDF file
            filename: Original filename
            
        Returns:
            ProcessedDocument with extracted data
        """
        logger.info(f"Processing PDF: {filename}")
        
        try:
            # Generate file hash for deduplication
            file_hash = generate_file_hash(pdf_path)
            logger.debug(f"File hash: {file_hash[:16]}...")
            
            # Open PDF
            doc = fitz.open(pdf_path)
            document_id = generate_document_id()
            pages_data: List[PageData] = []
            
            # Process each page
            for page_num in range(len(doc)):
                logger.debug(f"Processing page {page_num + 1}/{len(doc)}")
                page = doc[page_num]
                
                # Extract text
                page_text = page.get_text()
                
                # Extract images
                images = await self.extract_page_images(page, page_num, document_id)
                
                # Create page data
                page_data = PageData(
                    page_number=page_num,
                    text=page_text,
                    images=images
                )
                pages_data.append(page_data)
            
            doc.close()
            
            # Create processed document
            processed_doc = ProcessedDocument(
                document_id=document_id,
                filename=filename,
                filepath=pdf_path,
                file_hash=file_hash,
                pages=pages_data,
                total_pages=len(pages_data)
            )
            
            logger.info(f"PDF processed successfully: {len(pages_data)} pages")
            return processed_doc
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise
    
    async def extract_page_images(
        self,
        page: fitz.Page,
        page_num: int,
        document_id: str
    ) -> List[ImageData]:
        """
        Extract images from a PDF page and generate captions
        
        Args:
            page: PyMuPDF page object
            page_num: Page number
            document_id: Document ID
            
        Returns:
            List of ImageData objects
        """
        images_data: List[ImageData] = []
        
        try:
            # Get images from page
            image_list = page.get_images(full=True)
            
            for img_index, img_info in enumerate(image_list):
                try:
                    # Extract image
                    xref = img_info[0]
                    base_image = page.parent.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Convert to PIL Image
                    pil_image = Image.open(io.BytesIO(image_bytes))
                    
                    # Generate caption
                    caption = await self.image_processor.generate_caption(pil_image)
                    
                    # Get image position (bounding box)
                    # Note: This is a simplified approach; actual position may require more complex logic
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
                        # Default bbox if not found
                        bbox = BoundingBox(x0=0, y0=0, x1=100, y1=100)
                    
                    # Create image data
                    image_data = ImageData(
                        image_id=f"{document_id}_p{page_num}_img{img_index}",
                        caption=caption,
                        bbox=bbox,
                        page_number=page_num
                    )
                    
                    images_data.append(image_data)
                    logger.debug(f"Extracted image {img_index} from page {page_num}")
                    
                except Exception as e:
                    logger.warning(f"Failed to process image {img_index} on page {page_num}: {e}")
                    continue
            
            return images_data
            
        except Exception as e:
            logger.error(f"Error extracting images from page {page_num}: {e}")
            return []
