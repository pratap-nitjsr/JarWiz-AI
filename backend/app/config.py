"""Configuration and environment variables"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Google Cloud / Vertex AI Configuration
    # google_application_credentials: str | None = None
    google_project_id: str
    google_location: str = "us-central1"
    
    # Pinecone
    pinecone_api_key: str
    pinecone_environment: str
    pinecone_index_name: str = "pdf-multimodal-rag"
    
    # Serper API
    serper_api_key: str
    
    # MongoDB Configuration
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "jarwiz_db"
    
    # Google OAuth Configuration
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:3000/auth/callback"
    
    # JWT Configuration
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60  # 1 hour
    jwt_refresh_token_expire_days: int = 30  # 30 days
    
    # Cloudinary Configuration
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    
    # Backend Configuration
    # backend_host: str
    # backend_port: int
    upload_dir: str = "./uploads"
    max_file_size: int = 50000000  # 50MB
    
    # Model Configuration
    gemini_model: str = "gemini-1.5-flash"
    embedding_model: str = "text-embedding-004"
    
    # VLM Configuration (Vision Language Model for image captioning)
    gemini_vlm_model: str = "gemini-1.5-flash"
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 5
    
    # CORS Settings
    cors_origins: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        extra="ignore"
        case_sensitive = False


# Global settings instance
settings = Settings()


# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
