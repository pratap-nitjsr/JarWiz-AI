"""Chat query endpoints"""
from fastapi import APIRouter, HTTPException, Depends
import logging
from ...models.response import ChatRequest, ChatResponse
from ...services import RAGPipeline
from ...api.dependencies import get_rag_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: ChatRequest,
    rag_pipeline: RAGPipeline = Depends(get_rag_pipeline)
):
    """
    Process chat query using RAG pipeline with conversation memory
    
    Steps:
    1. Embed user query
    2. Search vector store for relevant chunks
    3. Perform conditional web search
    4. Generate answer with LLM (with conversation history)
    5. Create citations
    """
    try:
        logger.info(f"Processing chat query: {request.query[:50]}...")
        
        # Execute RAG pipeline WITH MEMORY
        response = await rag_pipeline.query(
            user_query=request.query,
            document_id=request.document_id,
            include_web_search=request.include_web_search,
            conversation_history=request.conversation_history
        )
        
        logger.info("Chat query processed successfully")
        return response
        
    except Exception as e:
        logger.error(f"Error processing chat query: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )
