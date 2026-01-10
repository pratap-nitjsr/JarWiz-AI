"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from .config import settings
from .api.routes import documents_router, chat_router, citations_router, auth_router
from .db import MongoDB

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Multi-modal RAG Chatbot API with Authentication",
    description="Voice-enabled chatbot with PDF processing, RAG capabilities, and Google OAuth",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")  # Authentication routes
app.include_router(documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(citations_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-modal RAG Chatbot API with Authentication",
        "version": "2.0.0",
        "status": "running",
        "auth": "Google OAuth enabled"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "connected"}


@app.on_event("startup")
async def startup_event():
    """Startup tasks"""
    logger.info("Starting Multi-modal RAG Chatbot API with Authentication")
    logger.info(f"Upload directory: {settings.upload_dir}")
    
    # Connect to MongoDB
    await MongoDB.connect_db()
    logger.info("MongoDB connected successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown tasks"""
    logger.info("Shutting down Multi-modal RAG Chatbot API")
    
    # Close MongoDB connection
    await MongoDB.close_db()
    logger.info("MongoDB connection closed")


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        # reload=True
    )
