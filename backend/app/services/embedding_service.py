"""Embedding service using Google Gemini"""
from langchain_google_vertexai import VertexAIEmbeddings
from typing import List
import logging
import asyncio
from ..config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate embeddings using Google Gemini Embedding models"""
    
    def __init__(
        self,
        model_name: str = "text-embedding-004"
    ):
        """
        Initialize embedding service
        
        Args:
            model_name: Name of the embedding model
        """
        self.model_name = model_name
        
        # Initialize embeddings with Vertex AI
        self.embeddings = VertexAIEmbeddings(
            model_name=model_name,
            project=settings.google_project_id,
            location=settings.google_location,
        )
        
        logger.info(f"EmbeddingService initialized with model: {model_name} (Vertex AI)")
    
    async def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        """
        Generate embeddings for document chunks (sequential)
        
        Args:
            chunks: List of text chunks
            
        Returns:
            List of embedding vectors
        """
        try:
            logger.debug(f"Generating embeddings for {len(chunks)} chunks")
            
            # Generate embeddings
            embeddings = await self.embeddings.aembed_documents(chunks)
            
            logger.debug(f"Generated {len(embeddings)} embeddings")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating chunk embeddings: {e}")
            raise
    
    async def embed_chunks_parallel(
        self,
        chunks: List[str],
        batch_size: int = 100,
        max_concurrent: int = 10
    ) -> List[List[float]]:
        """
        Generate embeddings for document chunks in PARALLEL batches for maximum speed
        
        Optimizations:
        - Larger batch size (100 chunks per batch)
        - Higher concurrency (10 concurrent requests)
        - Efficient batching with asyncio.gather
        
        Args:
            chunks: List of text chunks
            batch_size: Number of chunks per batch (increased from 50 to 100)
            max_concurrent: Maximum concurrent batch processing (increased from 5 to 10)
            
        Returns:
            List of embedding vectors
        """
        try:
            logger.info(f"Generating embeddings for {len(chunks)} chunks in parallel (batch_size={batch_size}, max_concurrent={max_concurrent})")
            
            # Split chunks into batches
            batches = [chunks[i:i + batch_size] for i in range(0, len(chunks), batch_size)]
            logger.info(f"Split into {len(batches)} batches")
            
            # Process batches with concurrency limit
            semaphore = asyncio.Semaphore(max_concurrent)
            
            async def process_batch(batch: List[str], batch_num: int) -> List[List[float]]:
                async with semaphore:
                    logger.debug(f"Processing batch {batch_num + 1}/{len(batches)}")
                    result = await self.embeddings.aembed_documents(batch)
                    logger.debug(f"Completed batch {batch_num + 1}/{len(batches)}")
                    return result
            
            # Execute all batches concurrently
            results = await asyncio.gather(*[process_batch(batch, i) for i, batch in enumerate(batches)])
            
            # Flatten results
            all_embeddings = []
            for batch_embeddings in results:
                all_embeddings.extend(batch_embeddings)
            
            logger.info(f"Generated {len(all_embeddings)} embeddings in parallel")
            return all_embeddings
            
        except Exception as e:
            logger.error(f"Error generating chunk embeddings in parallel: {e}")
            raise
    
    async def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for user query
        
        Args:
            query: User query text
            
        Returns:
            Embedding vector
        """
        try:
            logger.debug(f"Generating embedding for query: {query[:50]}...")
            
            # Generate query embedding
            embedding = await self.embeddings.aembed_query(query)
            
            logger.debug("Query embedding generated successfully")
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise
    
    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        return await self.embed_query(text)
