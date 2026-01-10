"""MongoDB database connection and setup"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging
from ..config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB database manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    database = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB"""
        try:
            logger.info(f"Connecting to MongoDB")
            cls.client = AsyncIOMotorClient(settings.mongodb_url)
            cls.database = cls.client[settings.mongodb_db_name]
            
            # Test connection
            await cls.client.admin.command('ping')
            logger.info(f"Successfully connected to MongoDB database: {settings.mongodb_db_name}")
            
            # Create indexes
            await cls._create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")
    
    @classmethod
    async def _create_indexes(cls):
        """Create database indexes for performance"""
        try:
            # Users collection indexes
            await cls.database.users.create_index("email", unique=True)
            await cls.database.users.create_index("google_id", unique=True, sparse=True)
            
            # Documents collection indexes
            await cls.database.documents.create_index("user_id")
            await cls.database.documents.create_index("document_id", unique=True)
            await cls.database.documents.create_index([("user_id", 1), ("created_at", -1)])
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
    
    @classmethod
    def get_database(cls):
        """Get database instance"""
        if cls.database is None:
            raise Exception("Database not connected. Call connect_db() first")
        return cls.database


# Global database instance getter
def get_db():
    """Dependency to get database instance"""
    return MongoDB.get_database()
