"""Authentication models"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """User model"""
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    google_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "name": "John Doe",
                "picture": "https://example.com/photo.jpg",
                "google_id": "1234567890"
            }
        }


class UserInDB(User):
    """User model as stored in database"""
    hashed_password: Optional[str] = None


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: Optional[dict] = None  # Include user data in response


class TokenData(BaseModel):
    """Data encoded in JWT token"""
    user_id: str
    email: str
    exp: Optional[datetime] = None


class GoogleOAuthToken(BaseModel):
    """Google OAuth token"""
    access_token: str
    token_type: str
    expires_in: int
    scope: str
    id_token: str


class GoogleUserInfo(BaseModel):
    """Google user information"""
    id: str
    email: EmailStr
    verified_email: bool
    name: str
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    picture: Optional[str] = None
    locale: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request with Google OAuth code"""
    code: str
    redirect_uri: str = "http://localhost:3000/auth/callback"


class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    
    class Config:
        populate_by_name = True
