"""Citation retrieval endpoints"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
import logging
import base64
import os
from ...services import CitationGenerator
from ...api.dependencies import get_citation_generator
from ...config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/citations", tags=["citations"])


# In-memory store for demonstration
# In production, use a proper database
citation_store = {}


@router.get("/{citation_id}")
async def get_citation(
    citation_id: str,
    citation_generator: CitationGenerator = Depends(get_citation_generator)
):
    """
    Retrieve citation image by ID
    
    Returns base64 encoded image
    """
    try:
        # In a real implementation, you would:
        # 1. Look up citation metadata from database
        # 2. Get the document path and page number
        # 3. Generate the highlighted page image
        
        # For now, return a simple response
        if citation_id not in citation_store:
            raise HTTPException(status_code=404, detail="Citation not found")
        
        citation_data = citation_store[citation_id]
        
        # Generate citation image
        image_base64 = await citation_generator.generate_citation_image(
            pdf_path=citation_data["pdf_path"],
            page_number=citation_data["page_number"],
            highlight_texts=citation_data.get("highlight_texts", [])
        )
        
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
    citation_generator: CitationGenerator = Depends(get_citation_generator),
    highlight: bool = Query(False, description="Whether to include highlights")
):
    """
    Get full PDF page as image
    
    Args:
        filename: PDF filename
        page_number: Page number (0-indexed)
        highlight: Whether to include highlights (default: False for full page view)
    
    Returns:
        Base64 encoded page image
    """
    try:
        # Construct file path
        pdf_path = os.path.join(settings.upload_dir, filename)
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found")
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating page image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating page image: {str(e)}"
        )
