"""Authentication routes for Google OAuth"""
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timedelta
import logging
from bson import ObjectId
from ...models.auth import Token, LoginRequest, UserResponse, User
from ...utils.auth import (
    exchange_code_for_token,
    get_google_user_info,
    create_access_token,
    create_refresh_token
)
from ...db import get_db
from ...api.auth_dependencies import get_current_user
from ...config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/google/login", response_model=Token)
async def google_login(
    login_request: LoginRequest,
    db = Depends(get_db)
):
    """
    Authenticate user with Google OAuth
    
    Flow:
    1. Frontend redirects user to Google OAuth
    2. User authorizes and Google redirects back with code
    3. Frontend sends code to this endpoint
    4. Backend exchanges code for Google access token
    5. Backend gets user info from Google
    6. Backend creates or updates user in MongoDB
    7. Backend returns JWT tokens
    
    Args:
        login_request: Login request with Google OAuth code
        db: Database instance
        
    Returns:
        JWT access and refresh tokens
    """
    try:
        logger.info(f"Google login attempt")
        
        # Exchange authorization code for access token
        google_token = await exchange_code_for_token(
            login_request.code,
            login_request.redirect_uri
        )
        
        # Get user information from Google
        google_user = await get_google_user_info(google_token.access_token)
        
        logger.info(f"Google user authenticated: {google_user.email}")
        
        # Check if user exists in database
        existing_user = await db.users.find_one({"email": google_user.email})
        
        if existing_user:
            # Update existing user
            user_id = str(existing_user["_id"])
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "name": google_user.name,
                        "picture": google_user.picture,
                        "google_id": google_user.id,
                        "last_login": datetime.utcnow()
                    }
                }
            )
            logger.info(f"Updated existing user: {google_user.email}")
        else:
            # Create new user
            new_user = {
                "email": google_user.email,
                "name": google_user.name,
                "picture": google_user.picture,
                "google_id": google_user.id,
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "is_active": True
            }
            result = await db.users.insert_one(new_user)
            user_id = str(result.inserted_id)
            logger.info(f"Created new user: {google_user.email}")
        
        # Create JWT tokens
        token_data = {"sub": user_id, "email": google_user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        logger.info(f"Login successful for user: {google_user.email}")
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user={
                "id": user_id,
                "email": google_user.email,
                "name": google_user.name,
                "picture": google_user.picture
            }
        )
        
    except Exception as e:
        logger.error(f"Google login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    Args:
        current_user: Current authenticated user
        db: Database instance
        
    Returns:
        New JWT access and refresh tokens
    """
    try:
        # Create new tokens
        token_data = {"sub": current_user.id, "email": current_user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        logger.info(f"Token refreshed for user: {current_user.email}")
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60
        )
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not refresh token"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information
    """
    return UserResponse(
        id=current_user.id or "",
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        created_at=current_user.created_at
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout user
    
    Note: With JWT, logout is handled client-side by removing tokens.
    This endpoint is provided for compatibility and logging purposes.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out"}
