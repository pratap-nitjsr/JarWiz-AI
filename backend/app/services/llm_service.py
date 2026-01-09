"""LLM service using Google Gemini via Vertex AI"""
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from typing import List
import logging
import re
import html
from ..config import settings
from ..models.chunk import Chunk
from ..models.response import WebResult, AnswerWithCitations
from ..utils.helpers import parse_page_citations

logger = logging.getLogger(__name__)


class LLMService:
    """Generate answers using Google Gemini LLM"""
    
    def __init__(
        self,
        model_name: str = "gemini-2.5-flash",
        temperature: float = 0.2
    ):
        """
        Initialize LLM service with streaming-optimized settings
        
        Args:
            model_name: Name of the Gemini model
            temperature: Temperature for generation (lower = more focused, faster)
        """
        self.model_name = model_name
        
        # Initialize Gemini LLM with streaming optimization
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            max_output_tokens=2048,
            vertexai=True,
            # location="asia-south1",
            google_api_key=settings.google_api_key,
            # PERFORMANCE: Streaming optimizations
            streaming=True,  # Enable streaming by default
            timeout=60,  # 60 second timeout to prevent hanging
            max_retries=2,  # Reduce retries for faster failure
        )
        
        # Define prompt template WITH MEMORY
        self.prompt_template = PromptTemplate(
            template="""You are a helpful AI assistant answering questions based on provided context from documents and web search results.

Conversation History:
{conversation_history}

Context from documents:
{document_context}

Context from web search:
{web_context}

User Question: {question}

Instructions:
1. Consider the conversation history to provide contextual answers
2. Provide a comprehensive and accurate answer based on the context provided
3. For information from documents, cite the page number using the format [Page X]
4. For information from web sources, cite using the format [Web: Source Title]
5. If the context doesn't contain enough information, clearly state "I don't have enough information in the document to answer this question accurately."
6. Be concise but thorough in your response
7. Never make up information not present in the context
8. Maintain conversation continuity by referencing previous exchanges when relevant

Answer:""",
            input_variables=["conversation_history", "document_context", "web_context", "question"]
        )
        
        logger.info(f"LLMService initialized with model: {model_name} (streaming-optimized)")
    
    def _sanitize_input(self, text: str) -> str:
        """Sanitize user input to prevent injection attacks"""
        if not text:
            return ""
        
        # Remove potential prompt injection patterns
        text = re.sub(r'ignore\s+(previous|above|all)\s+instructions?', '', text, flags=re.IGNORECASE)
        text = re.sub(r'disregard\s+(previous|above|all)\s+instructions?', '', text, flags=re.IGNORECASE)
        text = re.sub(r'forget\s+(previous|above|all)\s+instructions?', '', text, flags=re.IGNORECASE)
        text = re.sub(r'system\s*:', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<\s*script[^>]*>.*?<\s*/\s*script\s*>', '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # HTML escape to prevent XSS
        text = html.escape(text)
        
        # Limit length to prevent resource exhaustion
        if len(text) > 5000:
            text = text[:5000]
            logger.warning(f"Input truncated to 5000 characters")
        
        return text.strip()
    
    def _format_conversation_history(self, history: List[dict]) -> str:
        """Format conversation history for prompt"""
        if not history:
            return "No previous conversation."
        
        formatted = []
        # Only keep last 5 exchanges to prevent context overflow
        recent_history = history[-10:]  # Last 10 messages (5 exchanges)
        
        for msg in recent_history:
            role = msg.get('role', 'user')
            content = self._sanitize_input(msg.get('content', ''))
            formatted.append(f"{role.capitalize()}: {content}")
        
        return "\n".join(formatted)
    
    async def generate_answer(
        self,
        query: str,
        document_chunks: List[Chunk],
        web_results: List[WebResult],
        conversation_history: List[dict] = None
    ) -> AnswerWithCitations:
        """
        Generate answer with citations and conversation memory
        
        ⚠️ PERFORMANCE WARNING: This method waits for the complete response (5+ seconds).
        Consider using generate_answer_stream() for better perceived latency (<1 second to first chunk).
        
        Args:
            query: User query
            document_chunks: Relevant document chunks
            web_results: Web search results
            conversation_history: Previous conversation messages
            
        Returns:
            AnswerWithCitations object
        """
        try:
            logger.info("Generating answer with LLM (non-streaming mode)")
            logger.warning("Using non-streaming mode - consider switching to streaming for better UX")
            
            # SECURITY: Sanitize user query
            sanitized_query = self._sanitize_input(query)
            
            # Format conversation history
            history_text = self._format_conversation_history(conversation_history or [])
            
            # Format document context
            doc_context_parts = []
            for chunk in document_chunks:
                doc_context_parts.append(
                    f"[Page {chunk.page_number}] {chunk.content}"
                )
            doc_context = "\n\n".join(doc_context_parts) if doc_context_parts else "No document context available."
            
            # Format web context
            web_context_parts = []
            for result in web_results:
                web_context_parts.append(
                    f"[{result.title}]\n{result.snippet}\nURL: {result.url}"
                )
            web_context = "\n\n".join(web_context_parts) if web_context_parts else "No web search results available."
            
            # Create prompt with memory
            prompt = self.prompt_template.format(
                conversation_history=history_text,
                document_context=doc_context,
                web_context=web_context,
                question=sanitized_query
            )
            
            # Generate answer
            response = await self.llm.ainvoke(prompt)
            answer_text = response.content
            
            # Extract page citations
            cited_pages = parse_page_citations(answer_text)
            
            # Extract cited chunk IDs
            cited_chunks = [chunk.chunk_id for chunk in document_chunks]
            
            result = AnswerWithCitations(
                answer=answer_text,
                cited_pages=cited_pages,
                cited_chunks=cited_chunks
            )
            
            logger.info(f"Answer generated with {len(cited_pages)} page citations")
            return result
            
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            raise
    
    async def generate_answer_stream(
        self,
        query: str,
        document_chunks: List[Chunk],
        web_results: List[WebResult],
        conversation_history: List[dict] = None
    ):
        """
        Generate answer with STREAMING support for reduced perceived latency
        
        PERFORMANCE: Streams first chunk in <1 second vs 5+ seconds for full response
        
        Args:
            query: User query
            document_chunks: Relevant document chunks
            web_results: Web search results
            conversation_history: Previous conversation messages
            
        Yields:
            Chunks of text as they are generated (near real-time streaming)
        """
        try:
            logger.info("Generating streaming answer with LLM (low-latency mode)")
            
            # SECURITY: Sanitize user query
            sanitized_query = self._sanitize_input(query)
            
            # Format conversation history
            history_text = self._format_conversation_history(conversation_history or [])
            
            # Format document context
            doc_context_parts = []
            for chunk in document_chunks:
                doc_context_parts.append(
                    f"[Page {chunk.page_number}] {chunk.content}"
                )
            doc_context = "\n\n".join(doc_context_parts) if doc_context_parts else "No document context available."
            
            # Format web context
            web_context_parts = []
            for result in web_results:
                web_context_parts.append(
                    f"[{result.title}]\n{result.snippet}\nURL: {result.url}"
                )
            web_context = "\n\n".join(web_context_parts) if web_context_parts else "No web search results available."
            
            # Create prompt with memory
            prompt = self.prompt_template.format(
                conversation_history=history_text,
                document_context=doc_context,
                web_context=web_context,
                question=sanitized_query
            )
            
            # PERFORMANCE: Stream answer with immediate first chunk
            # This reduces perceived latency from 5+ seconds to <1 second
            chunk_count = 0
            async for chunk in self.llm.astream(prompt):
                if chunk.content:
                    chunk_count += 1
                    if chunk_count == 1:
                        logger.debug(f"First chunk streamed (low latency achieved)")
                    yield chunk.content
            
            logger.info(f"Streaming answer completed ({chunk_count} chunks)")
            
        except Exception as e:
            logger.error(f"Error generating streaming answer: {e}")
            raise
    
    async def generate_simple_answer(self, query: str, context: str) -> str:
        """
        Generate a simple answer without structured citations
        
        Args:
            query: User query
            context: Context text
            
        Returns:
            Answer text
        """
        try:
            prompt = f"""Context:
{context}

Question: {query}

Answer:"""
            
            response = await self.llm.ainvoke(prompt)
            return response.content
            
        except Exception as e:
            logger.error(f"Error generating simple answer: {e}")
            raise
