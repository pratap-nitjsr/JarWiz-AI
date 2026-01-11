"""LLM service using Google Gemini via Vertex AI"""
from langchain_google_vertexai import ChatVertexAI
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
        model_name: str = "gemini-1.5-flash",
        temperature: float = 0.2
    ):
        """
        Initialize LLM service with streaming-optimized settings
        
        Args:
            model_name: Name of the Gemini model
            temperature: Temperature for generation (lower = more focused, faster)
        """
        self.model_name = model_name
        
        # Initialize Gemini LLM with streaming optimization via Vertex AI
        self.llm = ChatVertexAI(
            project=settings.google_project_id,
            location=settings.google_location,
            model_name=model_name,
            temperature=temperature,
            max_output_tokens=2048,
            streaming=True,
            max_retries=2,
        )
        
        # Define prompt templates for different modes
        self.prompt_template_both = PromptTemplate(
            template="""You are a helpful AI assistant answering questions based on provided context from documents and web search results.

Conversation History:
{conversation_history}

📚 Context from uploaded documents:
{document_context}

🌐 Context from web search:
{web_context}

User Question: {question}

Instructions:
1. Consider the conversation history to provide contextual answers
2. Prioritize information from documents when available, supplement with web results
3. For information from documents, cite the page number using the format [Page X]
4. For information from web sources, cite using the format [Web: Source Title]
5. If neither source has the answer, clearly state that
6. Be concise but thorough in your response
7. Never make up information not present in the context

Answer:""",
            input_variables=["conversation_history", "document_context", "web_context", "question"]
        )
        
        self.prompt_template_docs_only = PromptTemplate(
            template="""You are a helpful AI assistant answering questions based on uploaded documents.

Conversation History:
{conversation_history}

📚 Context from uploaded documents:
{document_context}

User Question: {question}

Instructions:
1. Consider the conversation history to provide contextual answers
2. Answer ONLY based on the document context provided above
3. Cite the page number using the format [Page X] for every piece of information
4. If the documents don't contain the answer, clearly state "I don't have enough information in the uploaded documents to answer this question."
5. Be concise but thorough in your response
6. Never make up information not present in the documents

Answer:""",
            input_variables=["conversation_history", "document_context", "question"]
        )
        
        self.prompt_template_web_only = PromptTemplate(
            template="""You are a helpful AI assistant answering questions using web search results.

Conversation History:
{conversation_history}

🌐 Web Search Results:
{web_context}

User Question: {question}

Instructions:
1. Consider the conversation history to provide contextual answers
2. Answer based on the web search results provided above
3. Cite sources using the format [Web: Source Title] for every piece of information
4. If the web results don't contain the answer, clearly state that the search didn't return relevant results
5. Be concise but thorough in your response
6. Always indicate when information comes from web sources

Answer:""",
            input_variables=["conversation_history", "web_context", "question"]
        )
        
        self.prompt_template_general = PromptTemplate(
            template="""You are a helpful AI assistant having a conversation with the user.

Conversation History:
{conversation_history}

User Message: {question}

Instructions:
1. You are in GENERAL CONVERSATION MODE - no documents or web search were used
2. Consider the conversation history to provide contextual responses
3. Answer based on your general knowledge
4. If the user seems to be asking about specific documents, suggest they upload documents or enable web search
5. Be helpful, friendly, and conversational
6. If you're unsure about specific facts, acknowledge your limitations
7. You can help with general questions, explanations, brainstorming, and casual conversation

Response:""",
            input_variables=["conversation_history", "question"]
        )
        
        logger.info(f"LLMService initialized with model: {model_name} (Vertex AI)")
    
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
    
    def _determine_context_mode(self, document_chunks: List[Chunk], web_results: List[WebResult]) -> str:
        """
        Determine which context mode to use based on available data
        
        Returns:
            One of: 'both', 'docs_only', 'web_only', 'general'
        """
        has_docs = document_chunks and len(document_chunks) > 0
        has_web = web_results and len(web_results) > 0
        
        if has_docs and has_web:
            return 'both'
        elif has_docs:
            return 'docs_only'
        elif has_web:
            return 'web_only'
        else:
            return 'general'
    
    def _create_prompt(
        self,
        mode: str,
        history_text: str,
        doc_context: str,
        web_context: str,
        sanitized_query: str
    ) -> str:
        """Create the appropriate prompt based on context mode"""
        if mode == 'both':
            return self.prompt_template_both.format(
                conversation_history=history_text,
                document_context=doc_context,
                web_context=web_context,
                question=sanitized_query
            )
        elif mode == 'docs_only':
            return self.prompt_template_docs_only.format(
                conversation_history=history_text,
                document_context=doc_context,
                question=sanitized_query
            )
        elif mode == 'web_only':
            return self.prompt_template_web_only.format(
                conversation_history=history_text,
                web_context=web_context,
                question=sanitized_query
            )
        else:  # general
            return self.prompt_template_general.format(
                conversation_history=history_text,
                question=sanitized_query
            )
    
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
            # Determine context mode
            mode = self._determine_context_mode(document_chunks, web_results)
            logger.info(f"Generating answer with LLM (non-streaming mode, context mode: {mode})")
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
            doc_context = "\n\n".join(doc_context_parts)
            
            # Format web context
            web_context_parts = []
            for result in web_results:
                web_context_parts.append(
                    f"[{result.title}]\n{result.snippet}\nURL: {result.url}"
                )
            web_context = "\n\n".join(web_context_parts)
            
            # Create prompt based on context mode
            prompt = self._create_prompt(
                mode=mode,
                history_text=history_text,
                doc_context=doc_context,
                web_context=web_context,
                sanitized_query=sanitized_query
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
            
            logger.info(f"Answer generated (mode: {mode}) with {len(cited_pages)} page citations")
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
            # Determine context mode
            mode = self._determine_context_mode(document_chunks, web_results)
            logger.info(f"Generating streaming answer with LLM (low-latency mode, context mode: {mode})")
            
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
            doc_context = "\n\n".join(doc_context_parts)
            
            # Format web context
            web_context_parts = []
            for result in web_results:
                web_context_parts.append(
                    f"[{result.title}]\n{result.snippet}\nURL: {result.url}"
                )
            web_context = "\n\n".join(web_context_parts)
            
            # Create prompt based on context mode
            prompt = self._create_prompt(
                mode=mode,
                history_text=history_text,
                doc_context=doc_context,
                web_context=web_context,
                sanitized_query=sanitized_query
            )
            
            # PERFORMANCE: Stream answer with immediate first chunk
            # This reduces perceived latency from 5+ seconds to <1 second
            chunk_count = 0
            async for chunk in self.llm.astream(prompt):
                if chunk.content:
                    chunk_count += 1
                    if chunk_count == 1:
                        logger.debug(f"First chunk streamed (low latency achieved, mode: {mode})")
                    yield chunk.content
            
            logger.info(f"Streaming answer completed (mode: {mode}, {chunk_count} chunks)")
            
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

    async def generate_long_content_stream(self, prompt: str):
        """
        Generate long-form content with streaming support (e.g., presentations)
        Uses extended token limit for longer outputs.
        
        Args:
            prompt: Full prompt for generation
            
        Yields:
            Content chunks as they are generated
        """
        try:
            # Use a longer output limit for presentations
            long_llm = ChatVertexAI(
                project=settings.google_project_id,
                location=settings.google_location,
                model_name=self.model_name,
                temperature=0.3,
                max_output_tokens=8192,  # Extended for presentations
                streaming=True,
                max_retries=2,
            )
            
            logger.info("Starting long content generation")
            chunk_count = 0
            async for chunk in long_llm.astream(prompt):
                if chunk.content:
                    chunk_count += 1
                    if chunk_count == 1:
                        logger.info("First chunk received in long content stream")
                    yield chunk.content
            
            logger.info(f"Long content generation completed ({chunk_count} chunks)")
            
        except Exception as e:
            logger.error(f"Error generating long content: {e}", exc_info=True)
            raise
