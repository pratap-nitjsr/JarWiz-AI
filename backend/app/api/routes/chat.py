"""Chat query endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import logging
import json
from ...models.response import ChatRequest, ChatResponse
from ...models.auth import User
from ...services import RAGPipeline
from ...api.dependencies import get_rag_pipeline
from ...api.auth_dependencies import get_current_user
from ...db.mongodb import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    rag_pipeline: RAGPipeline = Depends(get_rag_pipeline),
    db = Depends(get_db)
):
    """
    Process chat query using RAG pipeline with 4 search modes, conversation memory, and multi-document support
    
    🔐 **Authentication Required** - Only accessible by authenticated users
    
    Search Modes:
    - vector_only: Use only vector DB (no web search)
    - web_only: Use only web search (no vector DB)
    - both: Use vector DB + web search (hybrid)
    - none: Pure LLM response (no retrieval)
    
    Steps:
    1. Verify document ownership (if document_ids provided)
    2. Determine search mode
    3. Conditionally embed query and search vector store (supports multiple documents)
    4. Conditionally perform web search
    5. Generate answer with LLM (with conversation history)
    6. Create citations
    """
    try:
        logger.info(f"User {current_user.email} processing chat query (mode: {request.search_mode}, documents: {len(request.document_ids) if request.document_ids else 0}): {request.query[:50]}...")
        
        # Verify document ownership if document_ids provided
        if request.document_ids:
            for doc_id in request.document_ids:
                doc = await db.documents.find_one({"document_id": doc_id})
                if not doc:
                    raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
                if doc["user_id"] != current_user.id:
                    raise HTTPException(
                        status_code=403,
                        detail=f"You don't have permission to access document {doc_id}"
                    )
        
        # Execute RAG pipeline with search mode and multiple documents
        response = await rag_pipeline.query(
            user_query=request.query,
            document_ids=request.document_ids,
            search_mode=request.search_mode,
            conversation_history=request.conversation_history
        )
        
        logger.info(f"Chat query processed successfully for user {current_user.email}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat query: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )


@router.post("/stream")
async def chat_query_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    rag_pipeline: RAGPipeline = Depends(get_rag_pipeline),
    db = Depends(get_db)
):
    """
    Process chat query with streaming response and multi-document support
    
    🔐 **Authentication Required** - Only accessible by authenticated users
    
    Returns Server-Sent Events (SSE) stream with:
    - data: Text chunks as they are generated
    - event: done - Final metadata (citations, sources, etc.)
    """
    logger.info(f"Stream request received: query={request.query[:50] if request.query else 'empty'}, user={current_user.email}, user_id={current_user.id}")
    
    async def event_generator():
        try:
            logger.info(f"User {current_user.email} processing streaming chat query (mode: {request.search_mode}, documents: {len(request.document_ids) if request.document_ids else 0}): {request.query[:50]}...")
            
            # Verify document ownership if document_ids provided
            if request.document_ids:
                for doc_id in request.document_ids:
                    doc = await db.documents.find_one({"document_id": doc_id})
                    if not doc:
                        error_msg = f"Document {doc_id} not found"
                        yield f"data: {json.dumps({'error': error_msg})}\n\n"
                        return
                    if doc["user_id"] != current_user.id:
                        error_msg = f"You don't have permission to access document {doc_id}"
                        yield f"data: {json.dumps({'error': error_msg})}\n\n"
                        return
            
            # Get context based on search mode
            document_chunks = []
            web_results = []
            search_results = []
            
            # Vector DB search (supports multiple documents)
            if request.search_mode in ["vector_only", "both"] and request.document_ids and len(request.document_ids) > 0:
                from ...api.dependencies import get_embedding_service, get_vector_store
                
                embedding_service = get_embedding_service()
                vector_store = get_vector_store()
                
                query_embedding = await embedding_service.embed_query(request.query)
                search_results = await vector_store.search(
                    query_embedding=query_embedding,
                    top_k=5 * len(request.document_ids),  # More results for multiple documents
                    document_ids=request.document_ids
                )
                document_chunks = rag_pipeline._search_results_to_chunks(search_results)
            
            # Web search
            if request.search_mode in ["web_only", "both"]:
                web_results = await rag_pipeline.web_search.search(request.query, num_results=3)
            
            # Stream answer
            full_answer = ""
            async for chunk in rag_pipeline.llm_service.generate_answer_stream(
                query=request.query,
                document_chunks=document_chunks,
                web_results=web_results,
                conversation_history=request.conversation_history or []
            ):
                full_answer += chunk
                # Send chunk as SSE
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Generate metadata (citations, sources, etc.)
            from ...utils.helpers import parse_page_citations
            cited_pages = parse_page_citations(full_answer)
            
            citations = []
            if document_chunks and search_results:
                citations = await rag_pipeline._generate_citations(
                    cited_pages=cited_pages,
                    document_chunks=document_chunks,
                    search_results=search_results
                )
            
            sources = rag_pipeline._create_sources(document_chunks, web_results)
            
            # Send final metadata
            metadata = {
                'type': 'done',
                'citations': [c.dict() for c in citations],
                'sources': [s.dict() for s in sources],
                'web_search_used': len(web_results) > 0
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            logger.info("Streaming chat query completed")
            
        except Exception as e:
            logger.error(f"Error in streaming chat: {e}")
            error_msg = {'type': 'error', 'message': str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
