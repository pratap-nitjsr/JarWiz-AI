"""Image processing service using BLIP-2 or Gemini VLM for caption generation"""
from transformers import Blip2Processor, Blip2ForConditionalGeneration
from PIL import Image
import torch
from typing import Optional
import logging
import io
import base64

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Process images using BLIP-2 or Gemini VLM for caption generation"""
    
    def __init__(
        self, 
        use_gemini_vlm: bool = False,
        blip2_model_name: str = "Salesforce/blip2-opt-2.7b",
        gemini_vlm_model: str = "gemini-2.5-flash",
        google_api_key: Optional[str] = None
    ):
        self.use_gemini_vlm = use_gemini_vlm
        self.blip2_model_name = blip2_model_name
        self.gemini_vlm_model = gemini_vlm_model
        
        # BLIP-2 attributes
        self.processor: Optional[Blip2Processor] = None
        self.model: Optional[Blip2ForConditionalGeneration] = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._blip2_initialized = False
        
        # Gemini attributes
        self.gemini_model = None
        self._gemini_initialized = False
        self.google_api_key = google_api_key
        
        logger.info(f"ImageProcessor initialized with {'Gemini VLM' if use_gemini_vlm else 'BLIP-2'}")
        if not use_gemini_vlm:
            logger.info(f"Device: {self.device}")
    
    def _load_blip2_model(self):
        if self._blip2_initialized:
            return
        
        try:
            logger.info(f"Loading BLIP-2 model: {self.blip2_model_name}")
            self.processor = Blip2Processor.from_pretrained(self.blip2_model_name)
            self.model = Blip2ForConditionalGeneration.from_pretrained(
                self.blip2_model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
            )
            self.model.to(self.device)
            self._blip2_initialized = True
            logger.info("BLIP-2 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load BLIP-2 model: {e}")
            raise
    
    def _load_gemini_model(self):
        """Lazy load Gemini VLM via LangChain (non-deprecated)"""
        if self._gemini_initialized:
            return
        
        if not self.google_api_key:
            raise ValueError("Google API key is required for Gemini VLM")
        
        try:
            logger.info(f"Loading Gemini VLM model: {self.gemini_vlm_model}")
            self.gemini_model = ChatGoogleGenerativeAI(
                model=self.gemini_vlm_model,
                api_key=self.google_api_key,
                vertexai=True
            )
            self._gemini_initialized = True
            logger.info("Gemini VLM model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Gemini VLM model: {e}")
            raise
    
    async def _generate_caption_blip2(self, image: Image.Image, max_new_tokens: int = 50) -> str:
        self._load_blip2_model()
        
        try:
            inputs = self.processor(
                images=image,
                return_tensors="pt"
            ).to(self.device, torch.float16 if self.device == "cuda" else torch.float32)
            
            generated_ids = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens
            )
            
            caption = self.processor.batch_decode(
                generated_ids,
                skip_special_tokens=True
            )[0].strip()
            
            return caption
        except Exception as e:
            logger.error(f"Error generating caption with BLIP-2: {e}")
            return "Image description unavailable"
        
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
            logger.warning("Falling back to BLIP-2 for caption generation")
            return await self._generate_caption_blip2(image)
        
    async def generate_caption(self, image: Image.Image, max_new_tokens: int = 50) -> str:
        if self.use_gemini_vlm:
            return await self._generate_caption_gemini(image)
        return await self._generate_caption_blip2(image, max_new_tokens)
    
    async def generate_captions_batch(
        self,
        images: list[Image.Image],
        max_new_tokens: int = 50
    ) -> list[str]:
        return [await self.generate_caption(img, max_new_tokens) for img in images]
