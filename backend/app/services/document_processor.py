"""Document processing service using PyMuPDF"""
import fitz  # PyMuPDF
from PIL import Image
import io
import os
import asyncio
from typing import List, Tuple, Optional
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
    
    async def process_pdf(
        self,
        pdf_path: str,
        filename: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        max_concurrent_pages: int = 5
    ) -> ProcessedDocument:
        """
        Process PDF file to extract text and images with captions in PARALLEL
        
        Optimizations:
        - Process multiple pages concurrently
        - Parallel image extraction and captioning
        - Faster overall document processing
        
        Args:
            pdf_path: Path to PDF file
            filename: Original filename
            title: User-provided document title
            description: User-provided description for better indexing
            max_concurrent_pages: Maximum pages to process concurrently (default 5)
            
        Returns:
            ProcessedDocument with extracted data and metadata
        """
        logger.info(f"Processing PDF: {filename} (title: {title}) with parallel page processing")
        
        try:
            # Generate file hash for deduplication
            file_hash = generate_file_hash(pdf_path)
            logger.debug(f"File hash: {file_hash[:16]}...")
            
            # Open PDF
            doc = fitz.open(pdf_path)
            document_id = generate_document_id()
            total_pages = len(doc)
            
            logger.info(f"Processing {total_pages} pages in parallel (max_concurrent={max_concurrent_pages})")
            
            # Process pages in parallel
            semaphore = asyncio.Semaphore(max_concurrent_pages)
            
            async def process_page(page_num: int) -> PageData:
                async with semaphore:
                    logger.debug(f"Processing page {page_num + 1}/{total_pages}")
                    page = doc[page_num]
                    
                    # Extract text
                    page_text = page.get_text()
                    
                    # Extract images
                    images = await self.extract_page_images(page, page_num, document_id)
                    
                    logger.debug(f"Completed page {page_num + 1}/{total_pages}")
                    
                    # Create page data
                    return PageData(
                        page_number=page_num,
                        text=page_text,
                        images=images
                    )
            
            # Process all pages concurrently
            pages_data = await asyncio.gather(*[process_page(i) for i in range(total_pages)])
            
            doc.close()
            
            # Create processed document with metadata
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
            
            logger.info(f"PDF processed successfully: {len(pages_data)} pages (parallel processing)")
            return processed_doc
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise
    
    async def extract_page_images(
        self,
        page: fitz.Page,
        page_num: int,
        document_id: str,
        max_concurrent_images: int = 3
    ) -> List[ImageData]:
        """
        Extract images from a PDF page and generate captions in PARALLEL
        
        Optimizations:
        - Process multiple images concurrently
        - Parallel caption generation
        
        Args:
            page: PyMuPDF page object
            page_num: Page number
            document_id: Document ID
            max_concurrent_images: Maximum images to process concurrently (default 3)
            
        Returns:
            List of ImageData objects
        """
        try:
            # Get images from page
            image_list = page.get_images(full=True)
            
            if not image_list:
                return []
            
            logger.debug(f"Extracting {len(image_list)} images from page {page_num} in parallel")
            
            # Process images in parallel
            semaphore = asyncio.Semaphore(max_concurrent_images)
            
            async def process_image(img_index: int, img_info: tuple) -> Optional[ImageData]:
                async with semaphore:
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
                        
                        logger.debug(f"Extracted image {img_index} from page {page_num}")
                        return image_data
                        
                    except Exception as e:
                        logger.warning(f"Failed to process image {img_index} on page {page_num}: {e}")
                        return None
            
            # Process all images concurrently
            results = await asyncio.gather(*[process_image(i, img_info) for i, img_info in enumerate(image_list)])
            
            # Filter out None values
            images_data = [img for img in results if img is not None]
            
            logger.debug(f"Extracted {len(images_data)} images from page {page_num}")
            return images_data
            
        except Exception as e:
            logger.error(f"Error extracting images from page {page_num}: {e}")
            return []
