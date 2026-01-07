"""Dependency injection for API routes"""
from functools import lru_cache
from ..config import settings
from ..services import (
    DocumentProcessor,
    ImageProcessor,
    EmbeddingService,
    VectorStore,
    WebSearchService,
    LLMService,
    RAGPipeline,
    CitationGenerator
)
from ..utils import DocumentChunker


# Singleton instances
_image_processor = None
_document_processor = None
_embedding_service = None
_vector_store = None
_web_search = None
_llm_service = None
_rag_pipeline = None
_citation_generator = None
_document_chunker = None


def get_image_processor() -> ImageProcessor:
    """Get ImageProcessor singleton"""
    global _image_processor
    if _image_processor is None:
        _image_processor = ImageProcessor(
            use_gemini_vlm=settings.use_gemini_vlm,
            blip2_model_name=settings.blip2_model,
            gemini_vlm_model=settings.gemini_vlm_model,
            google_api_key=settings.google_api_key
        )
    return _image_processor


def get_document_processor() -> DocumentProcessor:
    """Get DocumentProcessor singleton"""
    global _document_processor
    if _document_processor is None:
        image_processor = get_image_processor()
        _document_processor = DocumentProcessor(image_processor=image_processor)
    return _document_processor


def get_embedding_service() -> EmbeddingService:
    """Get EmbeddingService singleton"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService(
            project_id=settings.google_cloud_project,
            location=settings.google_cloud_location,
            model_name=settings.embedding_model
        )
    return _embedding_service


def get_vector_store() -> VectorStore:
    """Get VectorStore singleton"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore(
            api_key=settings.pinecone_api_key,
            environment=settings.pinecone_environment,
            index_name=settings.pinecone_index_name
        )
    return _vector_store


def get_web_search() -> WebSearchService:
    """Get WebSearchService singleton"""
    global _web_search
    if _web_search is None:
        _web_search = WebSearchService(api_key=settings.serper_api_key)
    return _web_search


def get_llm_service() -> LLMService:
    """Get LLMService singleton"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService(
            project_id=settings.google_cloud_project,
            location=settings.google_cloud_location,
            model_name=settings.gemini_model
        )
    return _llm_service


def get_citation_generator() -> CitationGenerator:
    """Get CitationGenerator singleton"""
    global _citation_generator
    if _citation_generator is None:
        _citation_generator = CitationGenerator()
    return _citation_generator


def get_document_chunker() -> DocumentChunker:
    """Get DocumentChunker singleton"""
    global _document_chunker
    if _document_chunker is None:
        _document_chunker = DocumentChunker(
            embedding_model=settings.embedding_model,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )
    return _document_chunker


def get_rag_pipeline() -> RAGPipeline:
    """Get RAGPipeline singleton"""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline(
            embedding_service=get_embedding_service(),
            vector_store=get_vector_store(),
            web_search=get_web_search(),
            llm_service=get_llm_service(),
            citation_generator=get_citation_generator()
        )
    return _rag_pipeline
