"""Document upload and processing endpoints"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from typing import Optional
import os
import shutil
import logging
from ...models.response import UploadResponse
from ...services import (
    DocumentProcessor,
    ImageProcessor,
    EmbeddingService,
    VectorStore
)
from ...utils import DocumentChunker
from ...utils.helpers import generate_file_hash
from ...api.dependencies import (
    get_document_processor,
    get_embedding_service,
    get_vector_store,
    get_document_chunker
)
from ...config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    document_processor: DocumentProcessor = Depends(get_document_processor),
    document_chunker: DocumentChunker = Depends(get_document_chunker),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: VectorStore = Depends(get_vector_store)
):
    """
    Upload and process a PDF document with metadata and deduplication
    
    Steps:
    1. Save uploaded file
    2. Check if document already exists (by file hash)
    3. If exists, return existing document_id (skip processing)
    4. If new, process PDF (extract text and images with captions)
    5. Chunk document semantically
    6. Generate embeddings in parallel for speed
    7. Store in vector database with metadata
    """
    try:
        logger.info(f"Uploading file: {file.filename} (title: {title}, description: {description})")
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Validate file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > settings.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum of {settings.max_file_size} bytes"
            )
        
        # Save file
        file_path = os.path.join(settings.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved: {file_path}")
        
        # Generate file hash for deduplication
        file_hash = generate_file_hash(file_path)
        logger.info(f"File hash: {file_hash[:16]}...")
        
        # Check if document already exists
        existing_doc_id = await vector_store.find_document_by_hash(file_hash)
        
        if existing_doc_id:
            logger.info(f"Document already exists with ID: {existing_doc_id}")
            logger.info("Skipping processing, returning existing document")
            
            # Get page count from existing chunks
            # We can search for chunks with this document_id
            stats = vector_store.get_stats()
            
            return UploadResponse(
                document_id=existing_doc_id,
                filename=file.filename,
                total_pages=0,  # We don't have this info readily available
                is_duplicate=True,
                message="Document already exists. Using existing embeddings."
            )
        
        # New document - proceed with full processing
        logger.info("New document detected. Starting processing...")
        
        # Process PDF
        processed_doc = await document_processor.process_pdf(
            file_path,
            file.filename,
            title=title,
            description=description
        )
        
        # Chunk document
        chunks = await document_chunker.chunk_document(processed_doc)
        
        logger.info(f"Generating embeddings for {len(chunks)} chunks in parallel...")
        
        # Generate embeddings IN PARALLEL for speed
        chunk_texts = [chunk.content for chunk in chunks]
        embeddings = await embedding_service.embed_chunks_parallel(chunk_texts)
        
        logger.info(f"Embeddings generated, storing in vector DB...")
        
        # Store in vector database with file hash and metadata
        await vector_store.upsert_chunks(
            chunks,
            embeddings,
            file_hash=file_hash,
            title=title,
            description=description
        )
        
        logger.info(f"Document processed successfully: {processed_doc.document_id}")
        
        return UploadResponse(
            document_id=processed_doc.document_id,
            filename=file.filename,
            total_pages=processed_doc.total_pages,
            title=title,
            description=description,
            is_duplicate=False,
            message="Document processed successfully."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    vector_store: VectorStore = Depends(get_vector_store)
):
    """Delete a document and its chunks from vector store"""
    try:
        await vector_store.delete_by_document_id(document_id)
        return {"message": f"Document {document_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")


@router.get("/list")
async def list_documents(
    vector_store: VectorStore = Depends(get_vector_store)
):
    """List all uploaded documents"""
    try:
        documents = await vector_store.list_all_documents()
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@router.get("/{document_id}/metadata")
async def get_document_metadata(
    document_id: str,
    vector_store: VectorStore = Depends(get_vector_store)
):
    """Get metadata for a specific document"""
    try:
        metadata = await vector_store.get_document_metadata(document_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Document not found")
        return metadata
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting document metadata: {str(e)}")
