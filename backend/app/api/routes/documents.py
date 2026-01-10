"""Document upload and processing endpoints"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from typing import Optional
import os
import shutil
import logging
from bson import ObjectId
from ...models.response import UploadResponse
from ...models.auth import User
from ...services import (
    DocumentProcessor,
    ImageProcessor,
    EmbeddingService,
    VectorStore,
    cloudinary_service
)
from ...utils import DocumentChunker
from ...utils.helpers import generate_file_hash
from ...api.dependencies import (
    get_document_processor,
    get_embedding_service,
    get_vector_store,
    get_document_chunker
)
from ...api.auth_dependencies import get_current_user
from ...db import get_db
from ...config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    document_processor: DocumentProcessor = Depends(get_document_processor),
    document_chunker: DocumentChunker = Depends(get_document_chunker),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: VectorStore = Depends(get_vector_store),
    db = Depends(get_db)
):
    """
    Upload and process a PDF document with metadata, deduplication, and user association
    
    🔐 **Authentication Required**
    
    Steps:
    1. Validate user authentication
    2. Save uploaded file
    3. Check if document already exists (by file hash)
    4. If exists, check if user already has access
    5. If new, process PDF (extract text and images with captions)
    6. Chunk document semantically
    7. Generate embeddings in parallel for speed
    8. Store in vector database with metadata
    9. Associate document with user in MongoDB
    """
    try:
        logger.info(f"User {current_user.email} uploading file: {file.filename} (title: {title}, description: {description})")
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
        
        # Upload to Cloudinary for cloud storage (if configured)
        cloudinary_data = None
        if cloudinary_service.is_configured:
            cloudinary_data = await cloudinary_service.upload_document(
                file_path, 
                processed_doc.document_id, 
                file.filename
            )
            logger.info(f"Document uploaded to Cloudinary: {cloudinary_data}")
        
        # Store document metadata in MongoDB with user association
        document_record = {
            "document_id": processed_doc.document_id,
            "user_id": current_user.id,  # 🔐 Associate with user
            "filename": file.filename,
            "file_hash": file_hash,
            "title": title,
            "description": description,
            "total_pages": processed_doc.total_pages,
            "created_at": processed_doc.created_at,
            # Cloudinary data (if configured)
            "cloudinary_url": cloudinary_data.get("cloudinary_url") if cloudinary_data else None,
            "cloudinary_public_id": cloudinary_data.get("public_id") if cloudinary_data else None,
        }
        await db.documents.insert_one(document_record)
        
        logger.info(f"Document processed and associated with user {current_user.email}: {processed_doc.document_id}")
        
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
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    vector_store: VectorStore = Depends(get_vector_store),
    db = Depends(get_db)
):
    """
    Delete a document and its chunks from vector store
    
    🔐 **Authentication Required** - Users can only delete their own documents
    """
    try:
        logger.info(f"User {current_user.email} deleting document: {document_id}")
        
        # Check if document exists and belongs to user
        document = await db.documents.find_one({
            "document_id": document_id,
            "user_id": current_user.id
        })
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have permission to delete it"
            )
        
        # Delete from Cloudinary if exists
        cloudinary_public_id = document.get("cloudinary_public_id")
        if cloudinary_public_id and cloudinary_service.is_configured:
            await cloudinary_service.delete_document(cloudinary_public_id)
            logger.info(f"Document deleted from Cloudinary: {cloudinary_public_id}")
        
        # Delete local file if exists
        local_file_path = os.path.join(settings.upload_dir, document.get("filename", ""))
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
            logger.info(f"Local file deleted: {local_file_path}")
        
        # Delete from vector store
        await vector_store.delete_by_document_id(document_id)
        
        # Delete from MongoDB
        await db.documents.delete_one({"document_id": document_id})
        
        logger.info(f"Document deleted successfully: {document_id}")
        return {"message": f"Document {document_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")


@router.get("/list")
async def list_documents(
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    db = Depends(get_db)
):
    """
    List all uploaded documents for the current user
    
    🔐 **Authentication Required** - Only shows user's own documents
    """
    try:
        logger.info(f"User {current_user.email} listing documents")
        
        # Get documents for this user only
        cursor = db.documents.find({"user_id": current_user.id})
        documents = await cursor.to_list(length=1000)
        
        # Format response
        formatted_docs = []
        for doc in documents:
            formatted_docs.append({
                "id": doc["document_id"],
                "filename": doc.get("filename", "Unknown"),
                "total_pages": doc.get("total_pages", 0),
                "title": doc.get("title"),
                "description": doc.get("description"),
                "upload_date": doc.get("created_at"),
            })
        
        logger.info(f"Found {len(formatted_docs)} documents for user {current_user.email}")
        return {"documents": formatted_docs}
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@router.get("/{document_id}/metadata")
async def get_document_metadata(
    document_id: str,
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    db = Depends(get_db)
):
    """
    Get metadata for a specific document
    
    🔐 **Authentication Required** - Only accessible by document owner
    """
    try:
        # Verify ownership
        doc = await db.documents.find_one({"document_id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if doc["user_id"] != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to access this document"
            )
        
        # Return metadata
        metadata = {
            "document_id": doc["document_id"],
            "filename": doc.get("filename"),
            "file_hash": doc.get("file_hash"),
            "title": doc.get("title"),
            "description": doc.get("description"),
            "total_pages": doc.get("total_pages"),
            "created_at": doc.get("created_at"),
            "cloudinary_url": doc.get("cloudinary_url"),
        }
        
        logger.info(f"Retrieved metadata for document {document_id} for user {current_user.email}")
        return metadata
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting document metadata: {str(e)}")


@router.get("/file/{filename}")
async def get_document_file(
    filename: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Serve a document file
    
    🔐 **Authentication Required** - Only accessible by document owner
    """
    try:
        # Verify ownership
        doc = await db.documents.find_one({
            "filename": filename,
            "user_id": current_user.id
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found or you don't have access")
        
        file_path = os.path.join(settings.upload_dir, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Document file not found on server")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving document file: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving document: {str(e)}")
