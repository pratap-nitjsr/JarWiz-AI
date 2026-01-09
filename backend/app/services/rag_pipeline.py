"""RAG pipeline orchestration"""
from typing import List, Dict, Any, Optional
import logging
import fitz
import base64
from ..models.response import ChatResponse, Citation, Source, SearchResult, RelevantImage
from ..models.chunk import Chunk
from ..utils.helpers import generate_citation_id, extract_text_snippets
from .embedding_service import EmbeddingService
from .vector_store import VectorStore
from .web_search import WebSearchService
from .llm_service import LLMService
from .citation_generator import CitationGenerator

logger = logging.getLogger(__name__)


class RAGPipeline:
    """Orchestrate the RAG workflow"""
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: VectorStore,
        web_search: WebSearchService,
        llm_service: LLMService,
        citation_generator: CitationGenerator
    ):
        """
        Initialize RAG pipeline
        
        Args:
            embedding_service: EmbeddingService instance
            vector_store: VectorStore instance
            web_search: WebSearchService instance
            llm_service: LLMService instance
            citation_generator: CitationGenerator instance
        """
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.web_search = web_search
        self.llm_service = llm_service
        self.citation_generator = citation_generator
        
        logger.info("RAGPipeline initialized")
    
    async def query(
        self,
        user_query: str,
        document_ids: Optional[List[str]] = None,
        search_mode: str = "both",  # "vector_only", "web_only", "both", "none"
        top_k: int = 5,
        conversation_history: List[dict] = None
    ) -> ChatResponse:
        """
        Execute RAG pipeline with flexible search modes and multi-document support
        
        Args:
            user_query: User's question
            document_ids: List of document IDs to query (supports multiple documents)
            search_mode: Search strategy - "vector_only", "web_only", "both", "none"
            top_k: Number of top results to retrieve per document
            conversation_history: Previous conversation messages for context
            
        Returns:
            ChatResponse with answer and citations
        """
        try:
            logger.info(f"Executing RAG query with mode '{search_mode}' across {len(document_ids) if document_ids else 0} documents: {user_query[:50]}...")
            
            # Initialize empty results
            search_results = []
            document_chunks = []
            document_confidence = 0.0
            web_results = []
            web_search_reason = None
            
            # Step 1: Vector DB Search (if mode allows and documents provided)
            if search_mode in ["vector_only", "both"] and document_ids and len(document_ids) > 0:
                query_embedding = await self.embedding_service.embed_query(user_query)
                search_results = await self.vector_store.search(
                    query_embedding=query_embedding,
                    top_k=top_k * len(document_ids),  # Get more results for multiple documents
                    document_ids=document_ids  # Search across multiple documents
                )
                document_chunks = self._search_results_to_chunks(search_results)
                document_confidence = self._calculate_document_confidence(search_results)
                logger.info(f"Vector search across {len(document_ids)} documents: {len(document_chunks)} chunks, confidence: {document_confidence:.2%}")
            
            # Step 2: Web Search (if mode allows)
            if search_mode in ["web_only", "both"]:
                web_results = await self.web_search.search(user_query, num_results=3)
                web_search_reason = f"Search mode: {search_mode}"
                logger.info(f"Web search: {len(web_results)} results")
            elif search_mode == "both" and document_confidence < 0.5:
                # Auto web search if vector results are weak
                web_results = await self.web_search.search(user_query, num_results=3)
                web_search_reason = "Low document confidence, supplementing with web search"
                logger.info(f"Auto web search triggered: {web_search_reason}")
            
            # Step 3: Generate answer with LLM
            answer_with_citations = await self.llm_service.generate_answer(
                query=user_query,
                document_chunks=document_chunks,
                web_results=web_results,
                conversation_history=conversation_history or []
            )
            
            # Step 6: Generate citation images for cited pages
            citations = await self._generate_citations(
                cited_pages=answer_with_citations.cited_pages,
                document_chunks=document_chunks,
                search_results=search_results
            )
            
            # Step 4: Create source objects
            sources = self._create_sources(document_chunks, web_results)
            
            # Step 5: Extract relevant images from chunks (only if vector search was used)
            relevant_images = []
            if search_mode in ["vector_only", "both"] and search_results:
                relevant_images = await self._extract_relevant_images(
                    document_chunks=document_chunks,
                    search_results=search_results
                )
            
            # Create response
            response = ChatResponse(
                answer=answer_with_citations.answer,
                citations=citations,
                sources=sources,
                relevant_images=relevant_images,
                query=user_query,
                web_search_used=len(web_results) > 0,
                web_search_reason=web_search_reason,
                document_confidence=document_confidence
            )
            
            logger.info("RAG query completed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error in RAG pipeline: {e}")
            raise
    
    def _search_results_to_chunks(self, search_results: List[SearchResult]) -> List[Chunk]:
        """Convert SearchResults to Chunks"""
        from ..models.chunk import Chunk, ChunkMetadata
        
        chunks = []
        for result in search_results:
            metadata = ChunkMetadata(
                page_number=result.page_number,
                chunk_type=result.chunk_type,
                position=result.metadata.get("position", 0),
                source_document=result.metadata.get("source_document", "")
            )
            
            chunk = Chunk(
                chunk_id=result.chunk_id,
                content=result.content,
                document_id=result.metadata.get("document_id", ""),
                page_number=result.page_number,
                chunk_type=result.chunk_type,
                metadata=metadata
            )
            chunks.append(chunk)
        
        return chunks
    
    async def _generate_citations(
        self,
        cited_pages: List[int],
        document_chunks: List[Chunk],
        search_results: List[SearchResult]
    ) -> List[Citation]:
        """Generate citation objects with page images"""
        citations = []
        
        # Group chunks by page
        pages_dict: Dict[int, List[Chunk]] = {}
        for chunk in document_chunks:
            page_num = chunk.page_number
            if page_num not in pages_dict:
                pages_dict[page_num] = []
            pages_dict[page_num].append(chunk)
        
        # Create citations for cited pages
        for page_num in cited_pages:
            if page_num in pages_dict:
                page_chunks = pages_dict[page_num]
                
                # Get relevance score from search results
                relevance_score = 0.0
                for result in search_results:
                    if result.page_number == page_num:
                        relevance_score = max(relevance_score, result.score)
                
                # Extract text snippet
                text_snippet = extract_text_snippets(
                    page_chunks[0].content,
                    max_length=200
                )
                
                # Get document path from metadata
                document_path = None
                for chunk in page_chunks:
                    doc_id = chunk.document_id
                    # You would need to store document paths somewhere accessible
                    # For now, we'll generate citations without images
                    break
                
                citation = Citation(
                    citation_id=generate_citation_id(),
                    page_number=page_num,
                    relevance_score=relevance_score,
                    text_snippet=text_snippet,
                    highlight_regions=[]  # Will be populated by citation generator
                )
                
                citations.append(citation)
        
        return citations
    
    def _create_sources(
        self,
        document_chunks: List[Chunk],
        web_results: List
    ) -> List[Source]:
        """Create source objects"""
        sources = []
        
        # Add document sources
        seen_pages = set()
        for chunk in document_chunks:
            page_num = chunk.page_number
            if page_num not in seen_pages:
                source = Source(
                    source_type="document",
                    title=f"Page {page_num}",
                    snippet=extract_text_snippets(chunk.content, max_length=150)
                )
                sources.append(source)
                seen_pages.add(page_num)
        
        # Add web sources
        for result in web_results:
            source = Source(
                source_type="web",
                title=result.title,
                url=result.url,
                snippet=result.snippet
            )
            sources.append(source)
        
        return sources
    
    async def _extract_relevant_images(
        self,
        document_chunks: List[Chunk],
        search_results: List[SearchResult]
    ) -> List[RelevantImage]:
        """Extract relevant images from document chunks"""
        
        relevant_images = []
        
        try:
            # Find image chunks
            image_chunks = [chunk for chunk in document_chunks if chunk.chunk_type == "image"]
            
            if not image_chunks:
                return relevant_images
            
            # Get document path from first chunk
            if not document_chunks:
                return relevant_images
                
            # We need to get the document path - let's get it from vector store
            doc_id = document_chunks[0].document_id
            doc_metadata = await self.vector_store.get_document_metadata(doc_id)
            
            if not doc_metadata or 'filepath' not in doc_metadata:
                logger.warning(f"Could not find document path for {doc_id}")
                return relevant_images
            
            pdf_path = doc_metadata['filepath']
            
            # Open PDF once
            doc = fitz.open(pdf_path)
            
            # Process each image chunk
            for chunk in image_chunks[:3]:  # Limit to top 3 images
                try:
                    # Get relevance score
                    relevance_score = 0.0
                    for result in search_results:
                        if result.chunk_id == chunk.chunk_id:
                            relevance_score = result.score
                            break
                    
                    # Extract image metadata from chunk
                    if 'image_id' not in chunk.metadata.additional_info:
                        continue
                    
                    image_id = chunk.metadata.additional_info['image_id']
                    page_num = chunk.page_number
                    
                    # Get bounding box
                    bbox_x0 = chunk.metadata.additional_info.get('bbox_x0', 0)
                    bbox_y0 = chunk.metadata.additional_info.get('bbox_y0', 0)
                    bbox_x1 = chunk.metadata.additional_info.get('bbox_x1', 100)
                    bbox_y1 = chunk.metadata.additional_info.get('bbox_y1', 100)
                    
                    # Get page
                    if page_num >= len(doc):
                        continue
                    
                    page = doc[page_num]
                    
                    # Get all images on the page and find the matching one
                    image_list = page.get_images(full=True)
                    
                    for img_index, img_info in enumerate(image_list):
                        try:
                            # Extract image
                            xref = img_info[0]
                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]
                            
                            # Convert to base64
                            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                            
                            # Get caption from chunk content
                            caption = chunk.content.replace(f"Image on page {page_num}: ", "")
                            
                            # Create RelevantImage
                            relevant_image = RelevantImage(
                                image_id=image_id,
                                image_base64=f"data:image/jpeg;base64,{image_base64}",
                                caption=caption,
                                page_number=page_num,
                                relevance_score=relevance_score
                            )
                            
                            relevant_images.append(relevant_image)
                            break  # Only take the first matching image per chunk
                            
                        except Exception as e:
                            logger.warning(f"Failed to extract image: {e}")
                            continue
                    
                except Exception as e:
                    logger.warning(f"Failed to process image chunk: {e}")
                    continue
            
            doc.close()
            
        except Exception as e:
            logger.error(f"Error extracting relevant images: {e}")
        
        return relevant_images
    
    def _calculate_document_confidence(self, search_results: List[SearchResult]) -> float:
        """Calculate confidence that document contains relevant information"""
        if not search_results:
            return 0.0
        
        # Use average of top 3 scores as confidence metric
        top_scores = [result.score for result in search_results[:3]]
        confidence = sum(top_scores) / len(top_scores) if top_scores else 0.0
        
        return confidence
