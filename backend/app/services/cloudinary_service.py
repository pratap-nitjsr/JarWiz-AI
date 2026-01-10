"""Cloudinary service for cloud document storage"""
import cloudinary
import cloudinary.uploader
import cloudinary.api
import logging
import os
from typing import Optional
from ..config import settings

logger = logging.getLogger(__name__)


class CloudinaryService:
    """Service for uploading and managing documents in Cloudinary"""
    
    def __init__(self):
        """Initialize Cloudinary configuration"""
        self._configured = False
        if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=True
            )
            self._configured = True
            logger.info("Cloudinary configured successfully")
        else:
            logger.warning("Cloudinary not configured - missing credentials. Documents will be stored locally only.")
    
    @property
    def is_configured(self) -> bool:
        """Check if Cloudinary is configured"""
        return self._configured
    
    async def upload_document(self, file_path: str, document_id: str, filename: str) -> Optional[dict]:
        """
        Upload a PDF document to Cloudinary
        
        Args:
            file_path: Local path to the PDF file
            document_id: Unique document ID
            filename: Original filename
            
        Returns:
            Dictionary with cloudinary_url and public_id if successful, None otherwise
        """
        if not self._configured:
            logger.warning("Cloudinary not configured, skipping upload")
            return None
        
        try:
            logger.info(f"Uploading document {document_id} to Cloudinary...")
            
            # Upload to Cloudinary as raw file (preserves PDF)
            result = cloudinary.uploader.upload(
                file_path,
                resource_type="raw",  # For non-image files like PDFs
                public_id=f"jarwiz/documents/{document_id}",
                folder="jarwiz/documents",
                overwrite=True,
                use_filename=True,
                unique_filename=False,
                context={
                    "original_filename": filename,
                    "document_id": document_id
                }
            )
            
            cloudinary_url = result.get("secure_url")
            public_id = result.get("public_id")
            
            logger.info(f"Document uploaded successfully: {cloudinary_url}")
            
            return {
                "cloudinary_url": cloudinary_url,
                "public_id": public_id,
                "format": result.get("format"),
                "bytes": result.get("bytes")
            }
            
        except Exception as e:
            logger.error(f"Error uploading to Cloudinary: {e}")
            return None
    
    async def delete_document(self, public_id: str) -> bool:
        """
        Delete a document from Cloudinary
        
        Args:
            public_id: Cloudinary public ID of the document
            
        Returns:
            True if deletion was successful
        """
        if not self._configured:
            return False
        
        try:
            logger.info(f"Deleting document from Cloudinary: {public_id}")
            
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type="raw"
            )
            
            success = result.get("result") == "ok"
            if success:
                logger.info(f"Document deleted successfully: {public_id}")
            else:
                logger.warning(f"Document deletion returned: {result}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting from Cloudinary: {e}")
            return False
    
    def get_document_url(self, public_id: str) -> Optional[str]:
        """
        Get the URL for a document in Cloudinary
        
        Args:
            public_id: Cloudinary public ID
            
        Returns:
            Secure URL for the document
        """
        if not self._configured:
            return None
        
        try:
            # Generate URL for raw resource
            url = cloudinary.CloudinaryResource(
                public_id=public_id,
                type="upload",
                resource_type="raw"
            ).build_url(secure=True)
            
            return url
        except Exception as e:
            logger.error(f"Error generating Cloudinary URL: {e}")
            return None


# Global instance
cloudinary_service = CloudinaryService()
