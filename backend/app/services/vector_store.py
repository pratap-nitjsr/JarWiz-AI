"""Vector store service using Pinecone"""
from pinecone import Pinecone, ServerlessSpec
from typing import List, Dict, Any, Optional
import logging
from ..models.chunk import Chunk
from ..models.response import SearchResult

logger = logging.getLogger(__name__)


class VectorStore:
    """Manage vector storage and retrieval using Pinecone"""
    
    def __init__(
        self,
        api_key: str,
        environment: str,
        index_name: str,
        dimension: int = 768,
        pool_threads: int = 30
    ):
        """
        Initialize Pinecone vector store with connection pooling
        
        Args:
            api_key: Pinecone API key
            environment: Pinecone environment
            index_name: Name of the index
            dimension: Dimension of embeddings
            pool_threads: Number of threads for connection pool (default 30 for parallel uploads)
        """
        self.api_key = api_key
        self.environment = environment
        self.index_name = index_name
        self.dimension = dimension
        
        # Initialize Pinecone with connection pooling for parallel requests
        self.pc = Pinecone(api_key=api_key, pool_threads=pool_threads)
        
        # Create index if it doesn't exist
        self._ensure_index_exists()
        
        # Connect to index
        self.index = self.pc.Index(index_name)
        
        logger.info(f"VectorStore initialized with index: {index_name}, pool_threads: {pool_threads}")
    
    def _ensure_index_exists(self):
        """Create index if it doesn't exist"""
        try:
            existing_indexes = [index.name for index in self.pc.list_indexes()]
            
            if self.index_name not in existing_indexes:
                logger.info(f"Creating new index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
                logger.info(f"Index created: {self.index_name}")
            else:
                logger.info(f"Index already exists: {self.index_name}")
                
        except Exception as e:
            logger.error(f"Error ensuring index exists: {e}")
            raise
    
    async def upsert_chunks(
        self,
        chunks: List[Chunk],
        embeddings: List[List[float]],
        file_hash: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        batch_size: int = 100,
        max_concurrent: int = 10
    ):
        """
        Store chunks in Pinecone with embeddings and metadata in PARALLEL batches for speed
        
        Args:
            chunks: List of Chunk objects
            embeddings: List of embedding vectors
            file_hash: Optional SHA-256 hash of source file for deduplication
            title: Document title for better search
            description: Document description for better indexing
            batch_size: Number of vectors per batch (default 100, Pinecone recommended)
            max_concurrent: Maximum concurrent upsert operations (default 10)
        """
        try:
            if len(chunks) != len(embeddings):
                raise ValueError("Number of chunks must match number of embeddings")
            
            logger.info(f"Upserting {len(chunks)} chunks to Pinecone in parallel (batch_size={batch_size}, max_concurrent={max_concurrent})")
            
            # Prepare vectors for upsert
            vectors = []
            for chunk, embedding in zip(chunks, embeddings):
                metadata = {
                    "content": chunk.content,
                    "document_id": chunk.document_id,
                    "page_number": chunk.page_number,
                    "chunk_type": chunk.chunk_type,
                    "source_document": chunk.metadata.source_document,
                    "position": chunk.metadata.position,
                    "title": title or "",  # Add title for better search
                    "description": description or "",  # Add description for context
                }
                
                # Add file hash for deduplication
                if file_hash:
                    metadata["file_hash"] = file_hash
                
                # Add additional metadata
                if chunk.metadata.additional_info:
                    metadata.update(chunk.metadata.additional_info)
                
                vectors.append({
                    "id": chunk.chunk_id,
                    "values": embedding,
                    "metadata": metadata
                })
            
            # Split into batches
            batches = [vectors[i:i + batch_size] for i in range(0, len(vectors), batch_size)]
            logger.info(f"Split into {len(batches)} batches for parallel upsert")
            
            # Upsert batches in parallel with concurrency limit
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            
            semaphore = asyncio.Semaphore(max_concurrent)
            
            async def upsert_batch(batch: List[dict], batch_num: int):
                async with semaphore:
                    # Run sync upsert in thread pool to avoid blocking
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(
                        None,
                        lambda: self.index.upsert(vectors=batch)
                    )
                    logger.debug(f"Upserted batch {batch_num + 1}/{len(batches)}")
            
            # Execute all batches concurrently
            await asyncio.gather(*[upsert_batch(batch, i) for i, batch in enumerate(batches)])
            
            logger.info(f"All {len(chunks)} chunks upserted successfully in parallel")
            
        except Exception as e:
            logger.error(f"Error upserting chunks: {e}")
            raise
    
    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None,
        document_ids: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        Semantic search for relevant chunks across single or multiple documents
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_dict: Optional metadata filter
            document_ids: Optional list of document IDs to search within (for multi-document search)
            
        Returns:
            List of SearchResult objects
        """
        try:
            logger.debug(f"Searching for top {top_k} results")
            
            # Build filter for multiple documents if provided
            if document_ids and len(document_ids) > 0:
                if len(document_ids) == 1:
                    # Single document - simple filter
                    filter_dict = {"document_id": document_ids[0]}
                else:
                    # Multiple documents - use $in operator
                    filter_dict = {"document_id": {"$in": document_ids}}
                logger.info(f"Searching across {len(document_ids)} documents")
            
            # Perform search
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict
            )
            
            # Convert to SearchResult objects
            search_results = []
            for match in results.matches:
                search_result = SearchResult(
                    chunk_id=match.id,
                    content=match.metadata.get("content", ""),
                    score=match.score,
                    page_number=match.metadata.get("page_number", 0),
                    chunk_type=match.metadata.get("chunk_type", "text"),
                    metadata=match.metadata
                )
                search_results.append(search_result)
            
            logger.info(f"Found {len(search_results)} results")
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            raise
    
    async def delete_by_document_id(self, document_id: str):
        """
        Delete all chunks for a document
        
        Args:
            document_id: Document ID to delete
        """
        try:
            logger.info(f"Deleting chunks for document: {document_id}")
            
            # Delete by filter
            self.index.delete(filter={"document_id": document_id})
            
            logger.info("Chunks deleted successfully")
            
        except Exception as e:
            logger.error(f"Error deleting chunks: {e}")
            raise
    
    async def find_document_by_hash(self, file_hash: str) -> Optional[str]:
        """
        Find existing document by file hash
        
        Args:
            file_hash: SHA-256 hash of the file
            
        Returns:
            document_id if found, None otherwise
        """
        try:
            logger.debug(f"Searching for document with hash: {file_hash[:16]}...")
            
            # Search for any chunk with this file_hash
            # We use a dummy query vector since we're filtering by metadata
            dummy_vector = [0.0] * self.dimension
            
            results = self.index.query(
                vector=dummy_vector,
                top_k=1,
                include_metadata=True,
                filter={"file_hash": file_hash}
            )
            
            if results.matches and len(results.matches) > 0:
                document_id = results.matches[0].metadata.get("document_id")
                logger.info(f"Found existing document: {document_id}")
                return document_id
            
            logger.debug("No existing document found with this hash")
            return None
            
        except Exception as e:
            logger.error(f"Error searching for document by hash: {e}")
            return None
    
    async def list_all_documents(self) -> List[Dict[str, Any]]:
        """
        List all unique documents in the vector store
        
        Returns:
            List of document metadata dictionaries
        """
        try:
            logger.debug("Listing all documents")
            
            # Get all unique documents by querying with dummy vector
            # and filtering to get unique document_ids
            dummy_vector = [0.0] * self.dimension
            
            # Query for many results to get all documents
            results = self.index.query(
                vector=dummy_vector,
                top_k=10000,  # Large number to get all chunks
                include_metadata=True
            )
            
            # Extract unique documents
            documents_dict = {}
            for match in results.matches:
                metadata = match.metadata
                doc_id = metadata.get("document_id")
                
                if doc_id and doc_id not in documents_dict:
                    documents_dict[doc_id] = {
                        "document_id": doc_id,
                        "filename": metadata.get("source_document", "Unknown"),
                        "file_hash": metadata.get("file_hash", ""),
                        "total_chunks": 0
                    }
                
                if doc_id:
                    documents_dict[doc_id]["total_chunks"] += 1
            
            documents_list = list(documents_dict.values())
            logger.info(f"Found {len(documents_list)} documents")
            return documents_list
            
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            return []
    
    async def get_document_metadata(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific document
        
        Args:
            document_id: Document ID to get metadata for
            
        Returns:
            Dictionary with document metadata or None
        """
        try:
            logger.debug(f"Getting metadata for document: {document_id}")
            
            dummy_vector = [0.0] * self.dimension
            
            results = self.index.query(
                vector=dummy_vector,
                top_k=1,
                include_metadata=True,
                filter={"document_id": document_id}
            )
            
            if results.matches and len(results.matches) > 0:
                metadata = results.matches[0].metadata
                return {
                    "document_id": document_id,
                    "filename": metadata.get("source_document", "Unknown"),
                    "file_hash": metadata.get("file_hash", "")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting document metadata: {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        try:
            stats = self.index.describe_index_stats()
            return stats
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return {}
