"""API route modules"""
from .documents import router as documents_router
from .chat import router as chat_router
from .citations import router as citations_router
from .auth import router as auth_router

__all__ = ["documents_router", "chat_router", "citations_router", "auth_router"]
