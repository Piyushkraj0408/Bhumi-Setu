import logging
import certifi
from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from app.core.config import settings

logger = logging.getLogger(__name__)

_mongo_client: MongoClient | None = None


def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        try:
            client_kwargs = {
                "serverSelectionTimeoutMS": 20000,
                "connectTimeoutMS": 20000,
                "socketTimeoutMS": 20000,
                "retryWrites": True,
            }
            # Use certifi CA file on Windows to prevent TLS handshake drop
            try:
                client_kwargs["tlsCAFile"] = certifi.where()
            except Exception:
                pass

            _mongo_client = MongoClient(settings.mongodb_uri, **client_kwargs)
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    return _mongo_client


def get_mongo_database() -> Database:
    client = get_mongo_client()
    return client[settings.mongodb_db_name]


def get_db() -> Database:
    """FastAPI dependency to provide a MongoDB database instance."""
    return get_mongo_database()


def init_db():
    """Create collections and required indexes in MongoDB."""
    try:
        db = get_mongo_database()

        # Users collection
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.users.create_index([("status", ASCENDING)])

        # Roles & Permissions collections
        db.roles.create_index([("name", ASCENDING)], unique=True)
        db.permissions.create_index([("name", ASCENDING)], unique=True)

        # Documents collection
        db.documents.create_index([("file_hash", ASCENDING)])
        db.documents.create_index([("uploader_id", ASCENDING)])
        db.documents.create_index([("scope_id", ASCENDING)])
        db.documents.create_index([("status", ASCENDING)])
        db.documents.create_index([("created_at", ASCENDING)])

        # Refresh Tokens collection
        db.refresh_tokens.create_index([("jti", ASCENDING)], unique=True)
        db.refresh_tokens.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)

        # Processing Jobs & Audit logs
        db.processing_jobs.create_index([("document_id", ASCENDING)])
        db.processing_jobs.create_index([("status", ASCENDING)])
        db.audit_logs.create_index([("created_at", ASCENDING)])

        logger.info("MongoDB schema and indexes initialized successfully.")
    except Exception as e:
        logger.warning(f"MongoDB initialization warning: {e}")
