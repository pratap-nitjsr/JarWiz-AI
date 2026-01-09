"""Configuration and environment variables"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Google Cloud / Vertex AI
    google_cloud_project: str
    google_cloud_location: str = "us-central1"
    google_application_credentials: Optional[str] = None
    
    # Google AI API Key (for embeddings)
    google_api_key: Optional[str] = None
    
    # Pinecone
    pinecone_api_key: str
    pinecone_environment: str
    pinecone_index_name: str = "pdf-multimodal-rag"
    
    # Serper API
    serper_api_key: str
    
    # Backend Configuration
    # backend_host: str
    # backend_port: int
    upload_dir: str = "./uploads"
    max_file_size: int = 50000000  # 50MB
    
    # Model Configuration
    gemini_model: str = "gemini-1.5-pro"
    embedding_model: str = "models/embedding-001"  # Google Generative AI embedding model
    blip2_model: str = "Salesforce/blip2-opt-2.7b"
    
    # VLM Configuration (Vision Language Model for image captioning)
    use_gemini_vlm: bool = False  # If True, use Gemini for image captioning; if False, use BLIP-2
    gemini_vlm_model: str = "gemini-1.5-flash"  # Gemini model for vision tasks (faster than pro)
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 5
    
    # CORS Settings
    cors_origins: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
