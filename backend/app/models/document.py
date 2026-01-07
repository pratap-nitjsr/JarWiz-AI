"""Document data models"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class BoundingBox(BaseModel):
    """Bounding box coordinates for images and text regions"""
    x0: float
    y0: float
    x1: float
    y1: float


class ImageData(BaseModel):
    """Image extracted from PDF page"""
    image_id: str
    caption: str
    bbox: BoundingBox
    page_number: int
    image_bytes: Optional[bytes] = None


class PageData(BaseModel):
    """Data for a single PDF page"""
    page_number: int
    text: str
    images: List[ImageData] = Field(default_factory=list)
    
    class Config:
        arbitrary_types_allowed = True


class ProcessedDocument(BaseModel):
    """Processed PDF document"""
    document_id: str
    filename: str
    filepath: str
    file_hash: str  # SHA-256 hash for deduplication
    pages: List[PageData]
    total_pages: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        arbitrary_types_allowed = True
