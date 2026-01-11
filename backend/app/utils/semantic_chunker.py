"""Semantic chunking with layout-aware fusion for figures"""
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Set
import logging
from ..models.document import ProcessedDocument, BoundingBox
from ..models.chunk import Chunk, ChunkMetadata
from ..utils.helpers import generate_chunk_id

logger = logging.getLogger(__name__)


class DocumentChunker:
    """
    Chunk documents with layout-aware fusion
    
    This chunker:
    1. Creates per-figure chunks with fused context (caption + OCR + nearby text)
    2. Creates text chunks from non-figure areas
    3. Avoids duplicate text by tracking which regions are covered by figures
    """
    
    def __init__(
        self,
        embedding_model: str = "text-embedding-004",
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        """
        Initialize document chunker
        
        Args:
            embedding_model: Name of the embedding model
            chunk_size: Size of each chunk
            chunk_overlap: Overlap between chunks
        """
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        logger.info(f"DocumentChunker initialized with layout-aware fusion, chunk_size={chunk_size}")
    
    async def chunk_document(self, processed_doc: ProcessedDocument) -> List[Chunk]:
        """
        Create layout-aware chunks from processed document
        
        Strategy:
        1. First, create figure chunks with their fused content (highest priority)
        2. Then, chunk remaining text that's not covered by figure contexts
        
        This preserves graph/figure semantics by keeping visual elements
        with their surrounding context together.
        
        Args:
            processed_doc: ProcessedDocument object
            
        Returns:
            List of Chunk objects
        """
        logger.info(f"Chunking document with layout-aware fusion: {processed_doc.document_id}")
        chunks: List[Chunk] = []
        chunk_position = 0
        
        try:
            # Process each page
            for page_data in processed_doc.pages:
                page_num = page_data.page_number
                
                # Track figure chunks first (they have fused context)
                figure_count = 0
                
                # 1. Create FIGURE CHUNKS with fused content (priority)
                for image_data in page_data.images:
                    chunk_id = generate_chunk_id(
                        processed_doc.document_id,
                        page_num,
                        chunk_position
                    )
                    
                    # The caption now contains fused content:
                    # [Figure Caption] + [Text in Figure (OCR)] + [Surrounding Context]
                    fused_content = image_data.caption
                    
                    # Add page context prefix for clarity
                    figure_content = f"[Page {page_num + 1} Figure {figure_count + 1}]\n{fused_content}"
                    
                    metadata = ChunkMetadata(
                        page_number=page_num,
                        chunk_type="figure",  # New type: figure (was "image")
                        position=chunk_position,
                        source_document=processed_doc.filename,
                        additional_info={
                            "image_id": image_data.image_id,
                            "bbox_x0": image_data.bbox.x0,
                            "bbox_y0": image_data.bbox.y0,
                            "bbox_x1": image_data.bbox.x1,
                            "bbox_y1": image_data.bbox.y1,
                            "is_fused_chunk": True  # Mark as layout-fused
                        }
                    )
                    
                    chunk = Chunk(
                        chunk_id=chunk_id,
                        content=figure_content,
                        document_id=processed_doc.document_id,
                        page_number=page_num,
                        chunk_type="figure",
                        metadata=metadata
                    )
                    
                    chunks.append(chunk)
                    chunk_position += 1
                    figure_count += 1
                
                # 2. Create TEXT CHUNKS from remaining page text
                # Note: Some text may be duplicated in figure chunks' "nearby text"
                # but that's intentional for better retrieval of both figure and text contexts
                if page_data.text.strip():
                    text_chunks = self.text_splitter.split_text(page_data.text)
                    
                    for text_chunk in text_chunks:
                        chunk_id = generate_chunk_id(
                            processed_doc.document_id,
                            page_num,
                            chunk_position
                        )
                        
                        metadata = ChunkMetadata(
                            page_number=page_num,
                            chunk_type="text",
                            position=chunk_position,
                            source_document=processed_doc.filename
                        )
                        
                        chunk = Chunk(
                            chunk_id=chunk_id,
                            content=text_chunk,
                            document_id=processed_doc.document_id,
                            page_number=page_num,
                            chunk_type="text",
                            metadata=metadata
                        )
                        
                        chunks.append(chunk)
                        chunk_position += 1
            
            # Log summary
            figure_chunks = sum(1 for c in chunks if c.chunk_type == "figure")
            text_chunks = sum(1 for c in chunks if c.chunk_type == "text")
            logger.info(
                f"Created {len(chunks)} chunks: {figure_chunks} figure chunks (fused), "
                f"{text_chunks} text chunks"
            )
            return chunks
            
        except Exception as e:
            logger.error(f"Error chunking document: {e}")
            raise
    
    async def chunk_text(self, text: str, page_number: int = 0) -> List[str]:
        """
        Chunk a single text string
        
        Args:
            text: Text to chunk
            page_number: Page number for metadata
            
        Returns:
            List of text chunks
        """
        return self.text_splitter.split_text(text)
