"""Chunk data models"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime


class ChunkMetadata(BaseModel):
    """Metadata for a document chunk"""
    page_number: int
    chunk_type: str  # "text" or "image"
    position: int  # Position in the page
    source_document: str
    additional_info: Dict[str, Any] = Field(default_factory=dict)


class Chunk(BaseModel):
    """Document chunk for vector storage"""
    chunk_id: str
    content: str
    document_id: str
    page_number: int
    chunk_type: str  # "text" or "image"
    metadata: ChunkMetadata
    embedding: Optional[list] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    filename: Optional[str] = None  # Document filename
    
    class Config:
        arbitrary_types_allowed = True
