"""API response models"""
from pydantic import BaseModel, Field
from typing import List, Optional
from .document import BoundingBox


class UploadResponse(BaseModel):
    """Response for document upload"""
    document_id: str
    filename: str
    total_pages: int
    title: Optional[str] = None
    description: Optional[str] = None
    is_duplicate: bool = False
    message: str = "Document uploaded and processed successfully"


class ChatRequest(BaseModel):
    """Request for chat query"""
    query: str
    document_ids: Optional[List[str]] = None  # Multiple documents support
    search_mode: str = "both"  # "vector_only", "web_only", "both", "none"
    conversation_history: List[dict] = Field(default_factory=list)


class ConversationMessage(BaseModel):
    """Single message in conversation history"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class Citation(BaseModel):
    """Citation from document"""
    citation_id: str
    page_number: int
    relevance_score: float
    text_snippet: str
    highlight_regions: List[BoundingBox] = Field(default_factory=list)
    image_base64: Optional[str] = None
    filename: Optional[str] = None  # Document filename
    document_id: Optional[str] = None  # Document ID


class Source(BaseModel):
    """Source information (document or web)"""
    source_type: str  # "document" or "web"
    title: str
    url: Optional[str] = None
    snippet: str
    relevance_score: Optional[float] = None


class RelevantImage(BaseModel):
    """Relevant image from the document"""
    image_id: str
    image_base64: str
    caption: str
    page_number: int
    relevance_score: float


class ChatResponse(BaseModel):
    """Response for chat query"""
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    sources: List[Source] = Field(default_factory=list)
    relevant_images: List[RelevantImage] = Field(default_factory=list)
    query: str
    web_search_used: bool = False
    web_search_reason: Optional[str] = None
    document_confidence: float = 0.0


class AnswerWithCitations(BaseModel):
    """LLM answer with extracted citations"""
    answer: str
    cited_pages: List[int] = Field(default_factory=list)
    cited_chunks: List[str] = Field(default_factory=list)


class WebResult(BaseModel):
    """Web search result"""
    title: str
    url: str
    snippet: str
    position: int


class SearchResult(BaseModel):
    """Vector search result"""
    chunk_id: str
    content: str
    score: float
    page_number: int
    chunk_type: str
    metadata: dict
