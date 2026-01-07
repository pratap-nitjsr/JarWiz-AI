"""Semantic chunking using LangChain SemanticChunker"""
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List
import logging
from ..models.document import ProcessedDocument
from ..models.chunk import Chunk, ChunkMetadata
from ..utils.helpers import generate_chunk_id

logger = logging.getLogger(__name__)


class DocumentChunker:
    """Chunk documents semantically using LangChain"""
    
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
        
        # Initialize text splitter (using RecursiveCharacterTextSplitter as a reliable alternative)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        logger.info(f"DocumentChunker initialized with chunk_size={chunk_size}")
    
    async def chunk_document(self, processed_doc: ProcessedDocument) -> List[Chunk]:
        """
        Create semantic chunks from processed document
        
        Args:
            processed_doc: ProcessedDocument object
            
        Returns:
            List of Chunk objects
        """
        logger.info(f"Chunking document: {processed_doc.document_id}")
        chunks: List[Chunk] = []
        chunk_position = 0
        
        try:
            # Process each page
            for page_data in processed_doc.pages:
                page_num = page_data.page_number
                
                # Chunk text content
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
                
                # Add image captions as chunks
                for image_data in page_data.images:
                    chunk_id = generate_chunk_id(
                        processed_doc.document_id,
                        page_num,
                        chunk_position
                    )
                    
                    # Create descriptive content for image
                    image_content = f"Image on page {page_num}: {image_data.caption}"
                    
                    metadata = ChunkMetadata(
                        page_number=page_num,
                        chunk_type="image",
                        position=chunk_position,
                        source_document=processed_doc.filename,
                        additional_info={
                            "image_id": image_data.image_id,
                            "bbox_x0": image_data.bbox.x0,
                            "bbox_y0": image_data.bbox.y0,
                            "bbox_x1": image_data.bbox.x1,
                            "bbox_y1": image_data.bbox.y1
                        }
                    )
                    
                    chunk = Chunk(
                        chunk_id=chunk_id,
                        content=image_content,
                        document_id=processed_doc.document_id,
                        page_number=page_num,
                        chunk_type="image",
                        metadata=metadata
                    )
                    
                    chunks.append(chunk)
                    chunk_position += 1
            
            logger.info(f"Created {len(chunks)} chunks from document")
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
