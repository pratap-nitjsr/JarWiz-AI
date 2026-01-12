"""Presentation API routes with Plate.js JSON support"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import logging
import uuid

from ..auth_dependencies import get_current_user
from ..dependencies import get_llm_service, get_cloudinary_service
from ...services.presentation_service import PresentationService, AVAILABLE_THEMES
from ...db.mongodb import get_db
from ...models.auth import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/presentation", tags=["presentation"])


# Request models
class TopicRequest(BaseModel):
    """Request for generating automatic topic"""
    context: str


class AutoGenerateRequest(BaseModel):
    """Request for auto-generating presentation with AI-determined settings"""
    context: str
    settings: Optional[dict] = None  # Optional manual override


class OutlineRequest(BaseModel):
    """Request for generating presentation outline (legacy)"""
    topic: str
    num_slides: int = 5
    additional_context: Optional[str] = None


class SlidesRequest(BaseModel):
    """Request for generating presentation slides"""
    topic: str
    outline: str
    additional_instructions: Optional[str] = None
    theme: str = "default"
    style: str = "professional"


class SavePresentationRequest(BaseModel):
    """Request for saving presentation"""
    title: str
    slides: List[dict]
    outline: Optional[str] = None
    theme: str = "default"
    style: str = "professional"


class UpdatePresentationRequest(BaseModel):
    """Request for updating existing presentation"""
    title: Optional[str] = None
    slides: Optional[List[dict]] = None
    outline: Optional[str] = None
    theme: Optional[str] = None
    style: Optional[str] = None


# Helper functions
def _parse_outline_to_list(outline: str) -> List[str]:
    """Parse markdown outline string into list of topics"""
    topics = []
    current_topic = None
    current_bullets = []
    
    for line in outline.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            if current_topic:
                topic_with_bullets = current_topic
                if current_bullets:
                    topic_with_bullets += "\n" + "\n".join(current_bullets)
                topics.append(topic_with_bullets)
            
            current_topic = line[2:]
            current_bullets = []
        elif line.startswith("- ") and current_topic:
            current_bullets.append(line)
    
    if current_topic:
        topic_with_bullets = current_topic
        if current_bullets:
            topic_with_bullets += "\n" + "\n".join(current_bullets)
        topics.append(topic_with_bullets)
    
    if not topics:
        topics = [t.strip() for t in outline.split("\n\n") if t.strip()]
    
    return topics if topics else [outline]


# Endpoints
@router.get("/themes")
async def get_available_themes():
    """Get list of available presentation themes"""
    return {"themes": AVAILABLE_THEMES}


@router.post("/extract-settings")
async def extract_settings(
    request: TopicRequest,
    user: User = Depends(get_current_user),
    llm_service = Depends(get_llm_service)
):
    """
    AI-extract optimal presentation settings from meeting context
    Returns: title, theme, numSlides, style, outline
    """
    try:
        presentation_service = PresentationService(llm_service)
        settings = await presentation_service.extract_presentation_settings(request.context)
        return {"success": True, "settings": settings}
    except Exception as e:
        logger.error(f"Error extracting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-generate")
async def auto_generate_presentation(
    request: AutoGenerateRequest,
    user: User = Depends(get_current_user),
    llm_service = Depends(get_llm_service)
):
    """
    Auto-generate complete presentation with streaming
    AI determines optimal settings from context, or uses provided settings
    """
    async def generate_stream():
        try:
            presentation_service = PresentationService(llm_service)
            
            async for chunk in presentation_service.generate_presentation_stream(
                context=request.context,
                settings=request.settings
            ):
                yield f"data: {chunk}\n\n"
                
        except Exception as e:
            logger.error(f"Error in auto-generate: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/suggest-topic")
async def suggest_topic(
    request: TopicRequest,
    user: User = Depends(get_current_user),
    llm_service = Depends(get_llm_service)
):
    """Generate a suggested presentation topic from meeting context (legacy)"""
    try:
        presentation_service = PresentationService(llm_service)
        topic = await presentation_service.generate_topic_from_context(request.context)
        return {"topic": topic}
    except Exception as e:
        logger.error(f"Error generating topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outline")
async def generate_outline(
    request: OutlineRequest,
    user: User = Depends(get_current_user),
    llm_service = Depends(get_llm_service)
):
    """Generate a presentation outline (streaming, legacy)"""
    async def generate_stream():
        try:
            presentation_service = PresentationService(llm_service)
            
            async for chunk in presentation_service.generate_outline_stream(
                topic=request.topic,
                num_slides=request.num_slides,
                context=request.additional_context
            ):
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"Error generating outline: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/generate")
async def generate_slides(
    request: SlidesRequest,
    user: User = Depends(get_current_user),
    llm_service = Depends(get_llm_service)
):
    """Generate presentation slides (streaming Plate.js JSON)"""
    async def generate_stream():
        try:
            logger.info(f"Starting slides generation for topic: {request.topic}")
            
            presentation_service = PresentationService(llm_service)
            outline_list = _parse_outline_to_list(request.outline)
            
            logger.info(f"Parsed outline into {len(outline_list)} topics")
            
            chunk_count = 0
            async for chunk in presentation_service.generate_slides_stream(
                title=request.topic,
                prompt=request.topic,
                outline=outline_list,
                context=request.additional_instructions,
                theme=request.theme,
                style=request.style
            ):
                chunk_count += 1
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            logger.info(f"Slides generation completed, sent {chunk_count} chunks")
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"Error generating slides: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/save")
async def save_presentation(
    request: SavePresentationRequest,
    user: User = Depends(get_current_user),
    cloudinary_service = Depends(get_cloudinary_service),
    db = Depends(get_db)
):
    """Save presentation to MongoDB (and optionally Cloudinary)"""
    try:
        user_id = user.id or "anonymous"
        presentation_id = str(uuid.uuid4())
        
        presentation_data = {
            "title": request.title,
            "slides": request.slides,
            "outline": request.outline or "",
            "theme": request.theme,
            "style": request.style,
            "user_id": user_id
        }
        
        cloudinary_url = None
        cloudinary_public_id = None
        
        if cloudinary_service.is_configured:
            result = await cloudinary_service.upload_presentation(
                presentation_data=presentation_data,
                title=request.title,
                user_id=user_id
            )
            
            if result:
                cloudinary_url = result.get("url")
                cloudinary_public_id = result.get("public_id")
        
        # Save to MongoDB
        presentation_doc = {
            "presentation_id": presentation_id,
            "user_id": user_id,
            "title": request.title,
            "outline": request.outline or "",
            "slides": request.slides,
            "slide_count": len(request.slides),
            "theme": request.theme,
            "style": request.style,
            "cloudinary_url": cloudinary_url,
            "cloudinary_public_id": cloudinary_public_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.presentations.insert_one(presentation_doc)
        logger.info(f"Presentation saved with ID: {presentation_id}")
        
        return {
            "success": True,
            "presentation_id": presentation_id,
            "url": cloudinary_url,
            "public_id": cloudinary_public_id
        }
            
    except Exception as e:
        logger.error(f"Error saving presentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{presentation_id}")
async def update_presentation(
    presentation_id: str,
    request: UpdatePresentationRequest,
    user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update an existing presentation"""
    try:
        user_id = user.id or "anonymous"
        
        # Check ownership
        existing = await db.presentations.find_one(
            {"presentation_id": presentation_id, "user_id": user_id}
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        
        if request.title is not None:
            update_doc["title"] = request.title
        if request.slides is not None:
            update_doc["slides"] = request.slides
            update_doc["slide_count"] = len(request.slides)
        if request.outline is not None:
            update_doc["outline"] = request.outline
        if request.theme is not None:
            update_doc["theme"] = request.theme
        if request.style is not None:
            update_doc["style"] = request.style
        
        await db.presentations.update_one(
            {"presentation_id": presentation_id},
            {"$set": update_doc}
        )
        
        logger.info(f"Presentation updated: {presentation_id}")
        
        return {"success": True, "presentation_id": presentation_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating presentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_presentations(
    user: User = Depends(get_current_user),
    db = Depends(get_db),
    limit: int = 20,
    skip: int = 0
):
    """List all presentations for the current user"""
    try:
        user_id = user.id or "anonymous"
        
        cursor = db.presentations.find(
            {"user_id": user_id},
            {
                "presentation_id": 1,
                "title": 1,
                "slide_count": 1,
                "theme": 1,
                "cloudinary_url": 1,
                "created_at": 1,
                "_id": 0
            }
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        presentations = await cursor.to_list(length=limit)
        
        # Convert datetime to ISO string
        for pres in presentations:
            if pres.get("created_at"):
                pres["created_at"] = pres["created_at"].isoformat()
        
        total = await db.presentations.count_documents({"user_id": user_id})
        
        return {
            "presentations": presentations,
            "total": total,
            "limit": limit,
            "skip": skip
        }
        
    except Exception as e:
        logger.error(f"Error listing presentations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{presentation_id}")
async def get_presentation(
    presentation_id: str,
    user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get a specific presentation by ID"""
    try:
        user_id = user.id or "anonymous"
        
        presentation = await db.presentations.find_one(
            {"presentation_id": presentation_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        # Convert datetime to ISO string
        if presentation.get("created_at"):
            presentation["created_at"] = presentation["created_at"].isoformat()
        if presentation.get("updated_at"):
            presentation["updated_at"] = presentation["updated_at"].isoformat()
        
        return presentation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting presentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{presentation_id}")
async def delete_presentation(
    presentation_id: str,
    user: User = Depends(get_current_user),
    db = Depends(get_db),
    cloudinary_service = Depends(get_cloudinary_service)
):
    """Delete a presentation"""
    try:
        user_id = user.id or "anonymous"
        
        presentation = await db.presentations.find_one(
            {"presentation_id": presentation_id, "user_id": user_id}
        )
        
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        # Delete from Cloudinary if exists
        if presentation.get("cloudinary_public_id") and cloudinary_service.is_configured:
            try:
                await cloudinary_service.delete_file(presentation["cloudinary_public_id"])
            except Exception as e:
                logger.warning(f"Failed to delete from Cloudinary: {e}")
        
        # Delete from MongoDB
        await db.presentations.delete_one({"presentation_id": presentation_id})
        
        return {"success": True, "message": "Presentation deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting presentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
