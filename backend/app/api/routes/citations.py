"""Citation retrieval endpoints"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
import logging
import base64
import os
import tempfile
import httpx
from ...services import CitationGenerator
from ...models.auth import User
from ...api.dependencies import get_citation_generator
from ...api.auth_dependencies import get_current_user
from ...db.mongodb import get_db
from ...config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/citations", tags=["citations"])


# In-memory store for demonstration
# In production, use a proper database
citation_store = {}


@router.get("/{citation_id}")
async def get_citation(
    citation_id: str,
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    citation_generator: CitationGenerator = Depends(get_citation_generator),
    db = Depends(get_db)
):
    """
    Retrieve citation image by ID
    
    🔐 **Authentication Required** - Only accessible by document owner
    
    Returns base64 encoded image
    """
    try:
        logger.info(f"User {current_user.email} requesting citation {citation_id}")
        
        # In a real implementation, you would:
        # 1. Look up citation metadata from database
        # 2. Verify user owns the document
        # 3. Get the document path and page number
        # 4. Generate the highlighted page image
        
        # For now, return a simple response
        if citation_id not in citation_store:
            raise HTTPException(status_code=404, detail="Citation not found")
        
        citation_data = citation_store[citation_id]
        
        # Verify document ownership
        doc = await db.documents.find_one({"document_id": citation_data.get("document_id")})
        if doc and doc["user_id"] != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this citation"
            )
        
        # Generate citation image
        image_base64 = await citation_generator.generate_citation_image(
            pdf_path=citation_data["pdf_path"],
            page_number=citation_data["page_number"],
            highlight_texts=citation_data.get("highlight_texts", [])
        )
        
        logger.info(f"Citation {citation_id} retrieved for user {current_user.email}")
        return {"citation_id": citation_id, "image": image_base64}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving citation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving citation: {str(e)}"
        )


@router.get("/page/{filename}/{page_number}")
async def get_full_page(
    filename: str,
    page_number: int,
    current_user: User = Depends(get_current_user),  # 🔐 Require authentication
    citation_generator: CitationGenerator = Depends(get_citation_generator),
    db = Depends(get_db),
    highlight: bool = Query(False, description="Whether to include highlights")
):
    """
    Get full PDF page as image
    
    🔐 **Authentication Required** - Only accessible by document owner
    
    Args:
        filename: PDF filename
        page_number: Page number (0-indexed)
        highlight: Whether to include highlights (default: False for full page view)
    
    Returns:
        Base64 encoded page image
    """
    try:
        logger.info(f"User {current_user.email} requesting page {page_number} of {filename}")
        
        # Verify document ownership based on filename
        doc = await db.documents.find_one({
            "filename": filename,
            "user_id": current_user.id
        })
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found or you don't have access")
        
        # Try local file first
        pdf_path = os.path.join(settings.upload_dir, filename)
        temp_file = None
        
        if not os.path.exists(pdf_path):
            # Try to fetch from Cloudinary
            cloudinary_url = doc.get("cloudinary_url")
            if cloudinary_url:
                logger.info(f"Local file not found, fetching from Cloudinary: {cloudinary_url}")
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(cloudinary_url, timeout=30.0)
                        response.raise_for_status()
                        
                        # Create a temporary file
                        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                        temp_file.write(response.content)
                        temp_file.close()
                        pdf_path = temp_file.name
                        logger.info(f"Downloaded PDF from Cloudinary to temp file: {pdf_path}")
                except Exception as e:
                    logger.error(f"Failed to fetch from Cloudinary: {e}")
                    raise HTTPException(status_code=404, detail="PDF file not found")
            else:
                raise HTTPException(status_code=404, detail="PDF file not found")
        
        try:
            # Generate page image without highlights for full page view
            image_base64 = await citation_generator.generate_citation_image(
                pdf_path=pdf_path,
                page_number=page_number,
                highlight_texts=None if not highlight else []
            )
            
            return {
                "filename": filename,
                "page_number": page_number,
                "image": image_base64
            }
        finally:
            # Clean up temp file if we created one
            if temp_file and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating page image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating page image: {str(e)}"
        )


@router.get("/document/{filename}/url")
async def get_document_url(
    filename: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get the URL for viewing/downloading a document
    
    🔐 **Authentication Required** - Only accessible by document owner
    
    Returns:
        URL to access the document (Cloudinary URL if available, or local path info)
    """
    try:
        logger.info(f"User {current_user.email} requesting URL for {filename}")
        
        # Verify document ownership
        doc = await db.documents.find_one({
            "filename": filename,
            "user_id": current_user.id
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found or you don't have access")
        
        cloudinary_url = doc.get("cloudinary_url")
        
        if cloudinary_url:
            return {
                "filename": filename,
                "url": cloudinary_url,
                "storage_type": "cloudinary"
            }
        else:
            # Check if local file exists
            local_path = os.path.join(settings.upload_dir, filename)
            if os.path.exists(local_path):
                return {
                    "filename": filename,
                    "url": f"/api/documents/file/{filename}",
                    "storage_type": "local"
                }
            else:
                raise HTTPException(status_code=404, detail="Document file not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document URL: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting document URL: {str(e)}"
        )
