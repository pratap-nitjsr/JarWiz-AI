"""Authentication dependencies for protected routes"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime
import logging
from ..models.auth import User, TokenData
from ..utils.auth import decode_token
from ..db import get_db

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer credentials with JWT token
        db: Database instance
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        token_data: Optional[TokenData] = decode_token(token)
        
        if token_data is None:
            raise credentials_exception
            
        # Get user from database
        user_doc = await db.users.find_one({"email": token_data.email})
        
        if user_doc is None:
            raise credentials_exception
            
        # Convert MongoDB document to User model
        user_id = str(user_doc["_id"])
        user = User(
            id=user_id,
            email=user_doc["email"],
            name=user_doc["name"],
            picture=user_doc.get("picture"),
            google_id=user_doc.get("google_id"),
            created_at=user_doc.get("created_at", datetime.utcnow()),
            last_login=user_doc.get("last_login"),
            is_active=user_doc.get("is_active", True)
        )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
            
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user
    
    Args:
        current_user: Current user from JWT token
        
    Returns:
        User object if active
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise
    Useful for endpoints that work with or without authentication
    
    Args:
        credentials: HTTP Bearer credentials (optional)
        db: Database instance
        
    Returns:
        User object if authenticated, None otherwise
    """
    if credentials is None:
        return None
        
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
