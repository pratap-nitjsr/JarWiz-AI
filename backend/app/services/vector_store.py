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
        dimension: int = 768
    ):
        """
        Initialize Pinecone vector store
        
        Args:
            api_key: Pinecone API key
            environment: Pinecone environment
            index_name: Name of the index
            dimension: Dimension of embeddings
        """
        self.api_key = api_key
        self.environment = environment
        self.index_name = index_name
        self.dimension = dimension
        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=api_key)
        
        # Create index if it doesn't exist
        self._ensure_index_exists()
        
        # Connect to index
        self.index = self.pc.Index(index_name)
        
        logger.info(f"VectorStore initialized with index: {index_name}")
    
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
        file_hash: Optional[str] = None
    ):
        """
        Store chunks in Pinecone with embeddings and metadata
        
        Args:
            chunks: List of Chunk objects
            embeddings: List of embedding vectors
            file_hash: Optional SHA-256 hash of source file for deduplication
        """
        try:
            if len(chunks) != len(embeddings):
                raise ValueError("Number of chunks must match number of embeddings")
            
            logger.info(f"Upserting {len(chunks)} chunks to Pinecone")
            
            # Prepare vectors for upsert
            vectors = []
            for chunk, embedding in zip(chunks, embeddings):
                metadata = {
                    "content": chunk.content,
                    "document_id": chunk.document_id,
                    "page_number": chunk.page_number,
                    "chunk_type": chunk.chunk_type,
                    "source_document": chunk.metadata.source_document,
                    "position": chunk.metadata.position
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
            
            # Upsert in batches of 100
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch)
                logger.debug(f"Upserted batch {i//batch_size + 1}")
            
            logger.info("Chunks upserted successfully")
            
        except Exception as e:
            logger.error(f"Error upserting chunks: {e}")
            raise
    
    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """
        Semantic search for relevant chunks
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_dict: Optional metadata filter
            
        Returns:
            List of SearchResult objects
        """
        try:
            logger.debug(f"Searching for top {top_k} results")
            
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
