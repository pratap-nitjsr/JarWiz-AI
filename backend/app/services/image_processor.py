"""Image processing service using Gemini VLM for caption generation"""
from PIL import Image
from typing import Optional
import logging
import io
import base64

from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Process images using Gemini VLM for caption generation"""
    
    def __init__(
        self, 
        gemini_vlm_model: str = "gemini-1.5-flash",
        google_api_key: Optional[str] = None,
        google_project_id: Optional[str] = None,
        google_location: str = "us-central1"
    ):
        self.gemini_vlm_model = gemini_vlm_model
        self.google_api_key = google_api_key
        self.google_project_id = google_project_id
        self.google_location = google_location
        
        # Gemini attributes
        self.gemini_model = None
        self._gemini_initialized = False
        
        logger.info(f"ImageProcessor initialized with Gemini VLM: {gemini_vlm_model} (Vertex AI)")
    
    def _load_gemini_model(self):
        """Lazy load Gemini VLM via LangChain (Vertex AI)"""
        if self._gemini_initialized:
            return
        
        if not self.google_project_id:
            raise ValueError("Google Project ID is required for Gemini VLM")
        
        try:
            logger.info(f"Loading Gemini VLM model: {self.gemini_vlm_model}")
            self.gemini_model = ChatVertexAI(
                project=self.google_project_id,
                location=self.google_location,
                model_name=self.gemini_vlm_model,
                
            )
            self._gemini_initialized = True
            logger.info("Gemini VLM model loaded successfully (Vertex AI)")
        except Exception as e:
            logger.error(f"Failed to load Gemini VLM model: {e}")
            raise
    
    def _prepare_image_for_gemini(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string for Gemini API"""
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    async def _generate_caption_gemini(self, image: Image.Image) -> str:
        self._load_gemini_model()
        
        try:
            # 1. Encode image to base64
            image_data = self._prepare_image_for_gemini(image)
            
            prompt = (
                "Describe this image in detail. Focus on the main content, objects, "
                "text, diagrams, charts, or any important visual elements. "
                "Be concise but comprehensive."
            )
            
            # 2. Use the correct LangChain format for Gemini
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                    },
                ]
            )
            
            # Use 'ainvoke' since your method is 'async'
            response = await self.gemini_model.ainvoke([message])
            return response.content.strip()
        
        except Exception as e:
            logger.error(f"Error generating caption with Gemini VLM: {e}")
            return "Image description unavailable"
        
    async def generate_caption(self, image: Image.Image, max_new_tokens: int = 50) -> str:
        """Generate caption using Gemini VLM"""
        return await self._generate_caption_gemini(image)
    
    async def generate_captions_batch(
        self,
        images: list[Image.Image],
        max_new_tokens: int = 50
    ) -> list[str]:
        """Generate captions for multiple images"""
        return [await self.generate_caption(img, max_new_tokens) for img in images]
